import { webhookCallback } from 'grammy'
import { getBot } from '@/lib/bot'
import { config } from '@/lib/config'

let handler: ((request: Request) => Promise<Response>) | null = null

export const POST = (request: Request): Promise<Response> => {
  handler ??= webhookCallback(getBot(), 'std/http', {
    secretToken: config.telegramWebhookSecret || undefined,
  })
  return handler(request)
}
