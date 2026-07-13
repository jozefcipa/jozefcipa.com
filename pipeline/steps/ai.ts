import { z } from 'zod'
import { completeObject } from '@/lib/openrouter'
import type { ArticleMeta, ReviewDecision } from '@/lib/types'

export async function generateMetadata(input: {
  title: string
  markdown: string
  existingTags: string[]
}): Promise<{ summary: string; tags: string[] }> {
  'use step'

  return completeObject({
    name: 'article_metadata',
    schema: z.object({
      summary: z
        .string()
        .describe(
          'A 2-3 sentence summary shown on the blog list page. Matter-of-fact, no hype, no "in this article". Written in the same voice as the article.',
        ),
      tags: z.array(z.string()).min(2).max(5).describe('Lowercase kebab-case tags'),
    }),
    prompt: [
      `Blog post title: "${input.title}"`,
      '',
      'Existing tags on the blog (STRONGLY prefer reusing these; only invent a new tag when nothing fits):',
      input.existingTags.join(', '),
      '',
      'Article content:',
      input.markdown,
    ].join('\n'),
  })
}

export async function interpretFeedback(input: { text: string; meta: ArticleMeta }): Promise<ReviewDecision> {
  'use step'

  return completeObject({
    name: 'review_decision',
    schema: z.object({
      action: z
        .enum(['publish', 'cancel', 'revise'])
        .describe(
          'publish = the user approves (e.g. "publish", "approve", "ship it", "lgtm", "looks good"). cancel = discard the draft entirely. revise = anything else: the user wants changes.',
        ),
      updates: z
        .object({
          title: z.string().optional(),
          slug: z.string().optional().describe('lowercase kebab-case'),
          tags: z.array(z.string()).optional().describe('the FULL new tag list, not a diff'),
          summary: z.string().optional(),
        })
        .optional()
        .describe('Only the metadata fields the user explicitly asked to change'),
      regenerateCover: z.boolean().optional().describe('true when the user wants a different cover image'),
      coverFeedback: z.string().optional().describe('what the user disliked / wants instead in the cover image'),
      refetchContent: z
        .boolean()
        .optional()
        .describe('true when the user says they edited the article in Notion and it should be re-imported'),
      reply: z.string().optional().describe('For revise only: a one-line confirmation of what you understood'),
    }),
    prompt: [
      'You are the review loop of a blog publishing bot. The author just replied to a draft review message.',
      '',
      'Current article metadata:',
      JSON.stringify(input.meta, null, 2),
      '',
      `Author's reply: "${input.text}"`,
      '',
      'Interpret the reply into an action.',
    ].join('\n'),
  })
}
