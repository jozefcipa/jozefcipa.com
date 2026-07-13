import { createHook, sleep } from 'workflow'
import { config } from '@/lib/config'
import type { ArticleMeta } from '@/lib/types'
import { generateMetadata, interpretFeedback } from '@/steps/ai'
import { commitDraft, createDraftBranch, discardDraft, fetchExistingTags, publishDraft } from '@/steps/github'
import { generateCover, processArticleImages } from '@/steps/images'
import { fetchNotionArticle } from '@/steps/notion'
import { waitForPreview } from '@/steps/preview'
import { postReview, sendMessage } from '@/steps/telegram'

const slugify = (title: string): string =>
  title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

export async function publishArticle(input: { notionUrl: string; chatId: string }) {
  'use workflow'

  const { notionUrl, chatId } = input

  // the review hook doubles as a per-chat mutex: its deterministic token can
  // only be held by one active run, so claim it before doing any work
  const feedbackHook = createHook<{ text: string }>({ token: `review:${chatId}` })
  const conflict = await feedbackHook.getConflict()
  if (conflict) {
    await sendMessage(chatId, '⚠️ Another article is already in review — reply "cancel" to discard it first.')
    return
  }

  try {
    await runPipeline(feedbackHook, notionUrl, chatId)
  } catch (error) {
    // tell the author what happened before the run is marked as failed
    const reason = error instanceof Error ? error.message : String(error)
    try {
      await sendMessage(
        chatId,
        [
          `❌ Publishing failed: ${reason}`,
          '',
          'Nothing was published. Any draft branch is left as-is and will be',
          'reused — just send me the Notion link again to retry.',
        ].join('\n'),
      )
    } catch {
      // even the failure notification failed — nothing more we can do here
    }
    throw error
  }
}

async function runPipeline(
  feedbackHook: AsyncIterable<{ text: string }>,
  notionUrl: string,
  chatId: string,
) {
  await sendMessage(chatId, '📥 Got it — importing the article from Notion…')
  const article = await fetchNotionArticle(notionUrl)

  const slug = slugify(article.title)
  const branch = `draft/${slug}`

  const existingTags = await fetchExistingTags()
  const generated = await generateMetadata({
    title: article.title,
    markdown: article.markdown,
    existingTags,
  })

  let meta: ArticleMeta = {
    title: article.title,
    slug,
    tags: generated.tags,
    summary: generated.summary,
  }

  await sendMessage(chatId, '🖼 Processing images and generating the cover…')
  let markdown = await processArticleImages({ markdown: article.markdown, slug })
  let coverUrl = await generateCover({ title: meta.title, summary: meta.summary, slug })

  await createDraftBranch(branch)
  await commitDraft({ branch, meta, markdown, coverUrl })

  await sendMessage(chatId, '🔨 Draft committed — waiting for the preview deployment…')
  let previewUrl = await waitForPreview({ branch, slug: meta.slug })
  await postReview({ chatId, meta, coverUrl, previewUrl })

  let currentSlug = meta.slug

  // suspends here (for days if needed) until the author replies on Telegram
  for await (const feedback of feedbackHook) {
    const decision = await interpretFeedback({ text: feedback.text, meta })

    if (decision.action === 'publish') {
      await publishDraft({ branch, meta, markdown, coverUrl })
      await sendMessage(chatId, `🎉 Published: ${config.siteBaseUrl}/blog/${meta.slug}/`)
      break
    }

    if (decision.action === 'cancel') {
      await discardDraft(branch)
      await sendMessage(chatId, '🗑 Draft discarded. Send me another Notion link whenever you are ready.')
      break
    }

    await sendMessage(chatId, `✏️ ${decision.reply ?? 'Applying your changes…'}`)

    if (decision.refetchContent) {
      const refreshed = await fetchNotionArticle(notionUrl)
      markdown = await processArticleImages({ markdown: refreshed.markdown, slug: meta.slug })
    }
    if (decision.updates) {
      meta = {
        ...meta,
        ...(decision.updates.title && { title: decision.updates.title }),
        ...(decision.updates.slug && { slug: slugify(decision.updates.slug) }),
        ...(decision.updates.tags && { tags: decision.updates.tags }),
        ...(decision.updates.summary && { summary: decision.updates.summary }),
      }
    }
    if (decision.regenerateCover) {
      coverUrl = await generateCover({
        title: meta.title,
        summary: meta.summary,
        slug: meta.slug,
        feedback: decision.coverFeedback ?? feedback.text,
      })
    }

    await commitDraft({ branch, meta, markdown, coverUrl, removeSlug: currentSlug })
    currentSlug = meta.slug

    // the branch URL keeps serving the previous deployment while the new one builds,
    // so give Vercel a head start before polling
    await sleep('1m')
    previewUrl = await waitForPreview({ branch, slug: meta.slug })
    await postReview({ chatId, meta, coverUrl, previewUrl })
  }
}
