import { Client } from '@notionhq/client'
import { NotionToMarkdown } from 'notion-to-md'
import { FatalError } from 'workflow'
import { config } from '@/lib/config'

export interface NotionArticle {
  pageId: string
  title: string
  markdown: string
}

const extractPageId = (url: string): string | null => {
  const match = url.replace(/-/g, '').match(/([0-9a-f]{32})/i)
  return match ? match[1] : null
}

export async function fetchNotionArticle(notionUrl: string): Promise<NotionArticle> {
  'use step'

  const pageId = extractPageId(notionUrl)
  if (!pageId) {
    throw new FatalError(`Could not extract a Notion page id from: ${notionUrl}`)
  }

  const notion = new Client({ auth: config.notionToken })

  const page = await notion.pages.retrieve({ page_id: pageId })
  let title = 'Untitled'
  if ('properties' in page) {
    for (const property of Object.values(page.properties)) {
      if (property.type === 'title' && property.title.length > 0) {
        title = property.title.map((part) => part.plain_text).join('')
      }
    }
  }

  const n2m = new NotionToMarkdown({ notionClient: notion })
  const blocks = await n2m.pageToMarkdown(pageId)
  const markdown = n2m.toMarkdownString(blocks).parent ?? ''

  if (!markdown.trim()) {
    throw new FatalError(`The Notion page "${title}" has no content`)
  }

  return { pageId, title, markdown }
}
