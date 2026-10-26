// One-time back-catalog backfill: writes alt text for every image in
// content/blog/*.md that has none (or only a file name), using the same
// describeImages step the publishing pipeline runs. Only the image markdown
// changes, front matter is left byte-for-byte intact. Review the git diff
// afterwards, nothing is committed automatically.
//
//   npm run backfill:alt -- --dry-run        # count images per post
//   npm run backfill:alt -- --only my-edc-collection
//   npm run backfill:alt                     # the real run
import { loadEnvFile } from 'node:process'

loadEnvFile() // reads ./.env

const run = async () => {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const { default: matter } = await import('gray-matter')
  // imported after env load, lib/config reads process.env lazily
  const { describeImages } = await import('@/steps/images')

  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null

  const blogDir = path.resolve(process.cwd(), '../content/blog')
  const files = (await fs.readdir(blogDir)).filter((file) => file.endsWith('.md') && !file.startsWith('_'))
  const failures: string[] = []

  for (const file of files) {
    const filePath = path.join(blogDir, file)
    const raw = await fs.readFile(filePath, 'utf8')
    const { data } = matter(raw)
    const slug = String(data.slug ?? file.replace(/\.md$/, ''))
    if (only && slug !== only) {
      continue
    }
    if (data.draft === true) {
      continue
    }

    const missing = [...raw.matchAll(/!\[([^\]]*)\]\(/g)].filter(
      (match) => !match[1].trim() || /^\S+\.(png|jpe?g|webp|gif|heic|svg)$/i.test(match[1].trim()),
    ).length
    if (missing === 0) {
      continue
    }
    console.log(`→ ${slug}: ${missing} image(s)`)
    if (dryRun) {
      continue
    }

    try {
      // runs on the whole file: front matter holds no image markdown
      const updated = await describeImages({ markdown: raw, title: String(data.title ?? slug) })
      await fs.writeFile(filePath, updated)
    } catch (error) {
      console.error(`  ✗ ${slug} failed:`, error instanceof Error ? error.message : error)
      failures.push(slug)
    }
  }

  if (failures.length > 0) {
    console.error(`failed: ${failures.join(', ')}, rerun with --only <slug> to retry individually`)
    process.exit(1)
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
