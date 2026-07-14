import { RetryableError } from 'workflow'
import { log } from '@/lib/log'

const POLL_ATTEMPTS = 20
const POLL_INTERVAL_MS = 10_000

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Vercel's deterministic preview URL for a branch:
// <project>-git-<branch>-<team>.vercel.app
export async function waitForPreview(input: { branch: string; slug: string }): Promise<string> {
  'use step'

  const url = `https://${input.branch}.jozefcipa.com/blog/${input.slug}/`
  log(`preview: waiting for ${url}`)

  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
    const response = await fetch(url, { method: 'HEAD', redirect: 'follow' }).catch(() => null)
    if (response?.ok) {
      log(`preview: ready after ${attempt + 1} attempt(s)`)
      return url
    }
    log(`preview: attempt ${attempt + 1}/${POLL_ATTEMPTS} — HTTP ${response?.status ?? 'unreachable'}`)
    await delay(POLL_INTERVAL_MS)
  }

  // not ready after ~3 minutes — suspend and let the step retry later
  console.error(`[pipeline] ✗ preview never became ready: ${url}`)
  throw new RetryableError('Preview deployment is not ready yet', { retryAfter: '1m' })
}
