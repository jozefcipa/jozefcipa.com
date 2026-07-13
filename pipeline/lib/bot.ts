import { Bot } from 'grammy'
import { resumeHook, start } from 'workflow/api'
import { publishArticle } from '@/workflows/publish-article'
import { config } from './config'

const NOTION_URL_REGEX = /https:\/\/(?:www\.)?(?:notion\.so|[\w-]+\.notion\.site)\/\S+/i

const HELP_MESSAGE = [
  'Send me a link to a Notion page and I will turn it into a blog post draft:',
  '',
  '1. I import the article, images included',
  '2. I generate a summary, tags and a cover image',
  '3. You get a preview link to review',
  '4. Reply "publish" and it goes live on jozefcipa.com',
].join('\n')

const registerHandlers = (bot: Bot): void => {
  bot.on('message:text', async (ctx) => {
    // single-user bot: ignore everyone but the owner
    if (String(ctx.from.id) !== config.telegramAllowedUserId) return

    const text = ctx.message.text.trim()
    const chatId = String(ctx.chat.id)

    const notionUrl = text.match(NOTION_URL_REGEX)?.[0]
    if (notionUrl) {
      // the workflow itself rejects a second run while one is in review
      // (the review hook token doubles as a per-chat mutex)
      await start(publishArticle, [{ notionUrl, chatId }])
      return
    }

    try {
      // a review in progress? deliver the reply to the waiting workflow
      await resumeHook(`review:${chatId}`, { text })
    } catch {
      await ctx.reply(`Nothing is in review right now.\n\n${HELP_MESSAGE}`)
    }
  })
}

let instance: Bot | null = null

// Lazy so that `next build` (which imports route modules without env vars)
// never constructs the Bot — grammY validates the token in the constructor
export const getBot = (): Bot => {
  if (!instance) {
    instance = new Bot(config.telegramBotToken)
    registerHandlers(instance)
  }
  return instance
}
