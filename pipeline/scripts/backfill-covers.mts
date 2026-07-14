// One-time back-catalog backfill for content/blog/*.md:
//   1. generates a `summary` for posts that don't have one (same prompt/voice
//      the publishing pipeline uses)
//   2. generates a cover image from that summary for posts without a `cover`
//      (same locked illustration style; uploads image + blur-up preview to S3)
//   3. makes sure every assets.jozefcipa.com image referenced by the post
//      (body + cover) has its blur-up twin at .../previews/<file> on S3,
//      generating and uploading the missing ones
// and writes summary/cover back into the post's front matter. Review the git
// diff afterwards — nothing is committed automatically.
//
// Posts that already have a cover (SVG scene variants, promoted photos,
// PaperMod-style maps) are left alone unless --force is passed. --force
// OVERWRITES curated summaries and covers — use --only first.
//
// Run through tsx (plain `node` cannot resolve the @/ path aliases):
//   npm run backfill -- --dry-run
//   npm run backfill -- --only my-edc-collection
//   npm run backfill                     # the real run
//   npm run backfill -- --skip-covers    # no image generation
//   npm run backfill -- --skip-previews  # no preview sync
import { loadEnvFile } from 'node:process'

loadEnvFile() // reads ./.env

const run = async () => {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const { default: matter } = await import('gray-matter')
  // imported after env load — lib/config reads process.env lazily
  const { generateMetadata } = await import('@/steps/ai')
  const { generateCover } = await import('@/steps/images')

  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const force = args.includes('--force')
  const skipCovers = args.includes('--skip-covers')
  const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null

  const blogDir = path.resolve(process.cwd(), '../content/blog')
  // _index.md is the section page, not an article
  const files = (await fs.readdir(blogDir)).filter((file) => file.endsWith('.md') && !file.startsWith('_'))

  // local tag vocabulary — generateMetadata wants it for context; the tags it
  // proposes are discarded, existing front matter tags are never touched
  const posts: Array<{ file: string; data: Record<string, unknown>; content: string }> = []
  const existingTags = new Set<string>()
  for (const file of files) {
    const { data, content } = matter(await fs.readFile(path.join(blogDir, file), 'utf8'))
    for (const tag of (data.tags as string[] | undefined) ?? []) existingTags.add(String(tag))
    posts.push({ file, data, content })
  }

  console.log(`${posts.length} posts found, tags vocabulary: ${existingTags.size}`)
  const failures: string[] = []
  let changed = 0

  for (const { file, data, content } of posts) {
    const slug = String(data.slug ?? file.replace(/\.md$/, ''))
  
    if (slug === '_index') continue
    if (only && slug !== only) continue
    if (data.draft === true) {
      console.log(`— ${slug}: draft, skipping`)
      continue
    }

    const needsSummary = force || !data.summary
    const needsCover = !skipCovers && (force || !data.cover)
    console.log(`→ ${slug} (summary: ${needsSummary ? 'yes' : 'keep'}, cover: ${needsCover ? 'yes' : 'keep'})`)

    try {
      // 1 + 2: front matter backfill
      if ((needsSummary || needsCover) && !dryRun) {
        let summary = data.summary as string | undefined
        if (needsSummary) {
          const meta = await generateMetadata({
            title: String(data.title ?? slug),
            markdown: content,
            existingTags: [...existingTags].sort(),
          })
          summary = meta.summary
          data.summary = summary
          console.log(`  summary: ${summary}`)
        }

        if (needsCover) {
          // generateCover uploads the cover AND its blur-up preview itself
          data.cover = await generateCover({
            title: String(data.title ?? slug),
            summary: summary ?? content.slice(0, 500),
            slug,
          })
          console.log(`  cover: ${data.cover}`)
        }

        await fs.writeFile(path.join(blogDir, file), matter.stringify(content, data))
        changed += 1
      }

    } catch (error) {
      console.error(`  ✗ ${slug} failed:`, error instanceof Error ? error.message : error)
      failures.push(slug)
    }
  }

  if (failures.length > 0) {
    console.error(`failed: ${failures.join(', ')} — rerun with --only <slug> to retry individually`)
    process.exit(1)
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
