import { Client } from '@notionhq/client'
import { NotionToMarkdown } from 'notion-to-md'
import { FatalError } from 'workflow'
import { config } from '@/lib/config'
import { log, logApiError } from '@/lib/log'

export interface NotionArticle {
  pageId: string
  title: string
  markdown: string
}

const extractPageId = (url: string): string | null => {
  // The ID is the trailing 32 hex chars of the path; anchoring matters because
  // slug words ending in a-f (e.g. "Zealand") would otherwise shift the match
  const path = url.split(/[?#]/)[0].replace(/-/g, '')
  const match = path.match(/([0-9a-f]{32})\/?$/i)
  return match ? match[1] : null
}

export async function fetchNotionArticle(notionUrl: string): Promise<NotionArticle> {
  'use step'

  const pageId = extractPageId(notionUrl)
  if (!pageId) {
    throw new FatalError(`Could not extract a Notion page id from: ${notionUrl}`)
  }
  log(`notion: fetching page ${pageId}`)

  const notion = new Client({ auth: config.notionToken })

  try {
    const page = await notion.pages.retrieve({ page_id: pageId })
    let title = 'Untitled'
    if ('properties' in page) {
      for (const property of Object.values(page.properties)) {
        if (property.type === 'title' && property.title.length > 0) {
          title = property.title.map((part) => part.plain_text).join('')
        }
      }
    }
    log(`notion: page title "${title}"`)

    const n2m = new NotionToMarkdown({ notionClient: notion })
    // notion-to-md flattens columns into consecutive blocks; render them
    // with the theme's `columns` shortcode so side-by-side layouts survive
    n2m.setCustomTransformer('column_list', async (block) => {
      const columns = await notion.blocks.children.list({ block_id: block.id })
      const parts = await Promise.all(
        columns.results.map(async (column) =>
          (n2m.toMarkdownString(await n2m.pageToMarkdown(column.id)).parent ?? '').trim(),
        ),
      )
      return `{{< columns >}}\n${parts.join('\n\n<--->\n\n')}\n{{< /columns >}}`
    })
    const blocks = await n2m.pageToMarkdown(pageId)
    const markdown = n2m.toMarkdownString(blocks).parent ?? ''
    log(`notion: converted to markdown (${markdown.length} chars)`)

    if (!markdown.trim()) {
      throw new FatalError(`The Notion page "${title}" has no content`)
    }

    return { pageId, title, markdown }
  } catch (error) {
    if (error instanceof FatalError) throw error
    logApiError(`notion fetch page ${pageId}`, error)
  }
}
