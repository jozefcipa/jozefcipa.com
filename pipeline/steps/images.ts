import { config } from '@/lib/config'
import { log } from '@/lib/log'
import { COVER_EXAMPLES } from '@/lib/cover-examples'
import { makePreview } from '@/lib/previews'
import { describeImage, generateImage } from '@/lib/openrouter'
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

// alt, src, optional title (`![alt](src "title")`)
const IMAGE_ALT_REGEX = /!\[([^\]]*)\]\(([^)\s]+)([^)]*)\)/g

// empty, or the file name Notion falls back to ("image.png", "XIAROl1.webp")
const lacksAltText = (alt: string): boolean => !alt.trim() || /^\S+\.(png|jpe?g|webp|gif|heic|svg)$/i.test(alt.trim())

const altTextPrompt = (input: { title: string; context: string }): string =>
  [
    `Write the alt text for this image from a blog post titled "${input.title}".`,
    '',
    'The text around the image in the post:',
    '"""',
    input.context,
    '"""',
    '',
    'Rules:',
    '- one plain sentence, at most 120 characters',
    '- describe what the image shows that matters to a reader of this post; for',
    '  screenshots, diagrams and code, say what they show, not just "a screenshot"',
    '- do not start with "Image of", "Picture of" or "Photo of"',
    '- refer to people neutrally (a person, a hiker, two people); never guess',
    '  their gender or age',
    '- no quotes, no markdown, no trailing period',
    '',
    'Reply with the alt text only.',
  ].join('\n')

// Fills in alt text for every image that has none, from the image itself plus
// the text around it. Relative paths (/blog/img/...) resolve against the live
// site. A failed description keeps the original alt, so it never blocks a post.
export async function describeImages(input: { markdown: string; title: string }): Promise<string> {
  'use step'

  const { markdown, title } = input
  const matches = [...markdown.matchAll(IMAGE_ALT_REGEX)].filter((match) => lacksAltText(match[1]))
  log(`images: ${matches.length} image(s) without alt text in "${title}"`)

  let result = ''
  let last = 0
  for (const match of matches) {
    const [full, alt, src, rest] = match
    const start = match.index
    const context = markdown
      .slice(Math.max(0, start - 600), start + full.length + 600)
      .replace(IMAGE_ALT_REGEX, '')
      .trim()
    const imageUrl = src.startsWith('/') ? `${config.siteBaseUrl}${src}` : src

    let newAlt = alt
    try {
      const described = await describeImage({ prompt: altTextPrompt({ title, context }), imageUrl })
      newAlt = described.replace(/[[\]\n]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\.$/, '')
    } catch (error) {
      console.error(`[pipeline] ✗ alt text failed for ${src}:`, error instanceof Error ? error.message : error)
    }

    result += `${markdown.slice(last, start)}![${newAlt}](${src}${rest})`
    last = start + full.length
  }

  return result + markdown.slice(last)
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
