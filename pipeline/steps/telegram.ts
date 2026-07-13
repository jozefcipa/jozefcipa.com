import { getBot } from '@/lib/bot'
import { log, logApiError } from '@/lib/log'
import type { ArticleMeta } from '@/lib/types'

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export async function sendMessage(chatId: string, text: string): Promise<void> {
  'use step'
  log(`telegram: sending "${text.slice(0, 60)}…"`)
  await getBot().api.sendMessage(chatId, text)
    .catch((error) => logApiError('telegram sendMessage', error))
}

export async function postReview(input: {
  chatId: string
  meta: ArticleMeta
  coverUrl: string
  previewUrl: string
}): Promise<void> {
  'use step'

  const { meta } = input
  const bot = getBot()

  log(`telegram: posting review for "${meta.title}"`)
  // Telegram fetches the cover from its public S3 URL
  await bot.api.sendPhoto(input.chatId, input.coverUrl)
    .catch((error) => logApiError(`telegram sendPhoto ${input.coverUrl}`, error))

  const review = [
    `<b>${escapeHtml(meta.title)}</b>`,
    '',
    escapeHtml(meta.summary),
    '',
    `🏷 tags: ${escapeHtml(meta.tags.join(', '))}`,
    `🔗 slug: <code>${escapeHtml(meta.slug)}</code>`,
    '',
    `👀 preview: ${escapeHtml(input.previewUrl)}`,
    '',
    'Reply <b>publish</b> to ship it, <b>cancel</b> to discard, or tell me what to change',
    '(title, slug, tags, summary, a different cover image, or "I updated the article in Notion").',
  ].join('\n')

  await bot.api.sendMessage(input.chatId, review, {
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
  }).catch((error) => logApiError('telegram sendMessage (review)', error))
}
