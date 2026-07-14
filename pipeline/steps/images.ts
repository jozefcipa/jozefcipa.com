import { config } from '@/lib/config'
import { log } from '@/lib/log'
import { COVER_EXAMPLES } from '@/lib/cover-examples'
import { makePreview } from '@/lib/previews'
import { generateImage } from '@/lib/openrouter'
import { uploadAsset } from '@/lib/s3'

const IMAGE_MARKDOWN_REGEX = /!\[[^\]]*\]\(([^)\s]+)\)/g

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

// Downloads every external image referenced in the markdown (Notion file URLs expire!),
// uploads the original + a small blurred preview to S3 and rewrites the markdown
// to point at assets.jozefcipa.com
export async function processArticleImages(input: { markdown: string; slug: string }): Promise<string> {
  'use step'

  const { markdown, slug } = input
  const urls = [...new Set([...markdown.matchAll(IMAGE_MARKDOWN_REGEX)].map((match) => match[1]))].filter(
    (url) => !url.startsWith(config.assetsBaseUrl),
  )
  log(`images: ${urls.length} external image(s) to mirror for ${slug}`)

  let result = markdown
  let index = 0
  for (const url of urls) {
    index += 1

    log(`images: downloading ${url.slice(0, 100)}`)
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`[pipeline] ✗ image download failed (HTTP ${response.status}): ${url}`)
      throw new Error(`Failed to download image ${url}: HTTP ${response.status}`)
    }
    const contentType = response.headers.get('content-type') ?? 'image/jpeg'
    const extension = EXTENSION_BY_CONTENT_TYPE[contentType] ?? 'jpg'
    const image = Buffer.from(await response.arrayBuffer())

    const name = `image-${index}.${extension}`
    const assetUrl = await uploadAsset(`blog/${slug}/${name}`, image, contentType)
    await uploadAsset(`blog/${slug}/previews/${name}`, await makePreview(image), contentType)

    result = result.split(url).join(assetUrl)
  }

  return result
}

// Locked style — this is what keeps covers consistent across articles.
// The model only decides the scene, never the style: a monochromatic
// engineering sketch in grays with one cobalt-blue accent, matching the theme.
const coverPrompt = (input: { title: string; summary: string; feedback?: string }): string =>
  [
    'Create a WORDLESS, completely text-free cover illustration for a technical',
    'blog post, in exactly the style of the attached example images.',
    '',
    `The article is titled "${input.title}" and summarized: "${input.summary}"`,
    '',
    'Draw ONE simple scene that captures what the article is about, using AT MOST',
    'FIVE objects — fewer is better. Pick the most recognizable, concrete objects',
    '(a device, a tool, a symbol of the concept) and arrange them as one coherent,',
    'sparse composition. If the article is about a thermostat, draw a thermostat.',
    '',
    ...(input.feedback
      ? [`The previous illustration was rejected with this feedback, respect it: "${input.feedback}"`, '']
      : []),
    'Match the attached examples exactly:',
    '- a minimal engineering sketch: thin dark-gray outline strokes on a plain',
    '  white background, like a schematic or patent drawing',
    '- very few lines per object — simple silhouettes, no interior detail beyond',
    '  what is needed to recognize the object',
    '- monochromatic grays only, EXCEPT exactly one element highlighted in cobalt',
    '  blue (#1565C0), marking the most meaningful part of the drawing',
    '- flat 2D, generous empty space, landscape composition',
    '',
    'STRICT RULE — THE IMAGE MUST CONTAIN NO TEXT OF ANY KIND: no words, no',
    'letters, no numbers, no labels, no captions, no logos, no writing on screens',
    'or devices. Screens and papers in the drawing must be blank or show only',
    'abstract gray lines. An image containing any glyph is a failed image.',
    'Also no: photorealism, gradients, shading, drop shadows, 3D rendering, or',
    'any color other than grays and the single blue accent.',
  ].join('\n')

export async function generateCover(input: {
  title: string
  summary: string
  slug: string
  feedback?: string
}): Promise<string> {
  'use step'

  log(`images: generating cover for "${input.title}"${input.feedback ? ' (with feedback)' : ''}`)
  const cover = await generateImage(coverPrompt(input), COVER_EXAMPLES)
  const extension = EXTENSION_BY_CONTENT_TYPE[cover.contentType] ?? 'png'

  // timestamped name so a regenerated cover busts Telegram/browser caches
  const name = `cover-${Date.now()}.${extension}`
  const coverUrl = await uploadAsset(`blog/${input.slug}/${name}`, cover.data, cover.contentType)
  await uploadAsset(`blog/${input.slug}/previews/${name}`, await makePreview(cover.data), cover.contentType)

  log(`images: cover ready at ${coverUrl}`)
  return coverUrl
}
