import matter from 'gray-matter'
import { Octokit } from 'octokit'
import { config } from '@/lib/config'
import type { ArticleMeta } from '@/lib/types'

const octo = () => new Octokit({ auth: config.githubToken })

const repoParts = (): { owner: string; repo: string } => {
  const [owner, repo] = config.githubRepo.split('/')
  return { owner, repo }
}

const postPath = (slug: string): string => `content/blog/${slug}.md`

const buildPostContent = (meta: ArticleMeta, markdown: string, coverUrl: string, date: string): string =>
  matter.stringify(markdown, {
    title: meta.title,
    tags: meta.tags,
    date,
    slug: meta.slug,
    summary: meta.summary,
    cover: coverUrl,
    draft: false,
  })

const getFileOnRef = async (
  path: string,
  ref: string,
): Promise<{ sha: string; content: string } | null> => {
  const { owner, repo } = repoParts()
  try {
    const { data } = await octo().rest.repos.getContent({ owner, repo, path, ref })
    if (Array.isArray(data) || data.type !== 'file') {
      return null
    }
    return { sha: data.sha, content: Buffer.from(data.content, 'base64').toString('utf8') }
  } catch (error) {
    if (isHttpError(error, 404)) {
      return null
    }
    throw error
  }
}

const isHttpError = (error: unknown, status: number): boolean =>
  typeof error === 'object' && error !== null && 'status' in error && error.status === status

// Collects every tag currently used on the blog, so the LLM prefers the existing taxonomy
export async function fetchExistingTags(): Promise<string[]> {
  'use step'

  const { owner, repo } = repoParts()
  const gh = octo()
  const { data } = await gh.rest.repos.getContent({
    owner,
    repo,
    path: 'content/blog',
    ref: config.siteDefaultBranch,
  })
  if (!Array.isArray(data)) {
    return []
  }

  const tags = new Set<string>()
  const files = data.filter((entry) => entry.type === 'file' && /\.(md|html)$/.test(entry.name))
  await Promise.all(
    files.map(async (file) => {
      if (!file.download_url) return
      const response = await fetch(file.download_url)
      if (!response.ok) return
      const frontMatter = matter(await response.text())
      for (const tag of frontMatter.data.tags ?? []) {
        tags.add(String(tag))
      }
    }),
  )

  return [...tags].sort()
}

export async function createDraftBranch(branch: string): Promise<void> {
  'use step'

  const { owner, repo } = repoParts()
  const gh = octo()
  const { data: base } = await gh.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${config.siteDefaultBranch}`,
  })

  try {
    await gh.rest.git.createRef({ owner, repo, ref: `refs/heads/${branch}`, sha: base.object.sha })
  } catch (error) {
    // 422 = branch already exists (e.g. a retried step) — that's fine
    if (!isHttpError(error, 422)) {
      throw error
    }
  }
}

export async function commitDraft(input: {
  branch: string
  meta: ArticleMeta
  markdown: string
  coverUrl: string
  removeSlug?: string
}): Promise<void> {
  'use step'

  const { owner, repo } = repoParts()
  const gh = octo()
  const path = postPath(input.meta.slug)

  const existing = await getFileOnRef(path, input.branch)
  const content = buildPostContent(input.meta, input.markdown, input.coverUrl, new Date().toISOString())
  await gh.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    branch: input.branch,
    message: `draft: ${input.meta.title}`,
    content: Buffer.from(content).toString('base64'),
    ...(existing && { sha: existing.sha }),
  })

  // the slug was changed during review — drop the file at the old path
  if (input.removeSlug && input.removeSlug !== input.meta.slug) {
    const oldPath = postPath(input.removeSlug)
    const oldFile = await getFileOnRef(oldPath, input.branch)
    if (oldFile) {
      await gh.rest.repos.deleteFile({
        owner,
        repo,
        path: oldPath,
        branch: input.branch,
        message: `draft: rename ${input.removeSlug} -> ${input.meta.slug}`,
        sha: oldFile.sha,
      })
    }
  }
}

// Publishing = a single clean commit straight to the default branch
// (the draft branch is deleted, which also removes the Vercel preview)
export async function publishDraft(input: {
  branch: string
  meta: ArticleMeta
  markdown: string
  coverUrl: string
}): Promise<void> {
  'use step'

  const { owner, repo } = repoParts()
  const gh = octo()
  const path = postPath(input.meta.slug)

  // if this slug is already published we're updating it — keep its original date
  const published = await getFileOnRef(path, config.siteDefaultBranch)
  const originalDate = published ? (matter(published.content).data.date as string | undefined) : undefined
  const date = originalDate ?? new Date().toISOString()

  const content = buildPostContent(input.meta, input.markdown, input.coverUrl, date)
  await gh.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    branch: config.siteDefaultBranch,
    message: `feat(article): ${input.meta.title}`,
    content: Buffer.from(content).toString('base64'),
    ...(published && { sha: published.sha }),
  })

  await discardDraftBranch(input.branch)
}

export async function discardDraft(branch: string): Promise<void> {
  'use step'
  await discardDraftBranch(branch)
}

const discardDraftBranch = async (branch: string): Promise<void> => {
  const { owner, repo } = repoParts()
  try {
    await octo().rest.git.deleteRef({ owner, repo, ref: `heads/${branch}` })
  } catch (error) {
    if (!isHttpError(error, 422) && !isHttpError(error, 404)) {
      throw error
    }
  }
}
