import { RetryableError } from 'workflow'
import { config } from '@/lib/config'

const POLL_ATTEMPTS = 20
const POLL_INTERVAL_MS = 10_000

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const sanitizeBranch = (branch: string): string =>
  branch
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

// Vercel's deterministic preview URL for a branch:
// <project>-git-<branch>-<team>.vercel.app
export async function waitForPreview(input: { branch: string; slug: string }): Promise<string> {
  'use step'

  const host = `${config.siteVercelProjectName}-git-${sanitizeBranch(input.branch)}-${config.vercelTeamSlug}.vercel.app`
  const url = `https://${host}/blog/${input.slug}/`

  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
    const response = await fetch(url, { method: 'HEAD', redirect: 'follow' }).catch(() => null)
    if (response?.ok) {
      return url
    }
    await delay(POLL_INTERVAL_MS)
  }

  // not ready after ~3 minutes — suspend and let the step retry later
  throw new RetryableError('Preview deployment is not ready yet', { retryAfter: '1m' })
}
