import sharp from 'sharp'
import { config } from '@/lib/config'
import { log } from '@/lib/log'
import { completeText, generateImage } from '@/lib/openrouter'
import { uploadAsset } from '@/lib/s3'

// same parameters as the original .bin/image-preview.js blur-up previews
const PREVIEW_WIDTH = 100
const PREVIEW_BLUR = 8

const IMAGE_MARKDOWN_REGEX = /!\[[^\]]*\]\(([^)\s]+)\)/g

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export const makePreview = (image: Buffer): Promise<Buffer> =>
  sharp(image).resize({ width: PREVIEW_WIDTH }).blur(PREVIEW_BLUR).toBuffer()

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

// Locked style prefix — this is what keeps covers consistent across articles.
// The model only decides the subject, never the style.
const COVER_STYLE_PROMPT = [
  'Flat vector illustration in a minimal outline style, similar to Cloudflare blog artwork:',
  'bold simple shapes, thin dark outlines, a 2-3 color palette with a single accent color',
  'on a light neutral background, generous negative space, clean composition, landscape orientation.',
  'Absolutely no text, no lettering, no photorealism, no gradients, no 3D rendering, no drop shadows.',
].join(' ')

export async function generateCover(input: {
  title: string
  summary: string
  slug: string
  feedback?: string
}): Promise<string> {
  'use step'

  log(`images: generating cover for "${input.title}"${input.feedback ? ' (with feedback)' : ''}`)
  const subject = await completeText(
    [
      'You are choosing the subject of a blog post cover illustration.',
      `Article title: "${input.title}"`,
      `Article summary: "${input.summary}"`,
      input.feedback ? `The previous illustration was rejected with this feedback: "${input.feedback}"` : '',
      'Describe in 1-2 sentences a single, simple, concrete visual concept (objects and composition only).',
      'Do not mention any style, colors or rendering technique. Reply with the concept only.',
    ]
      .filter(Boolean)
      .join('\n'),
  )

  const cover = await generateImage(`${COVER_STYLE_PROMPT}\n\nSubject: ${subject}`)
  const extension = EXTENSION_BY_CONTENT_TYPE[cover.contentType] ?? 'png'

  // timestamped name so a regenerated cover busts Telegram/browser caches
  const name = `cover-${Date.now()}.${extension}`
  const coverUrl = await uploadAsset(`blog/${input.slug}/${name}`, cover.data, cover.contentType)
  await uploadAsset(`blog/${input.slug}/previews/${name}`, await makePreview(cover.data), cover.contentType)

  log(`images: cover ready at ${coverUrl}`)
  return coverUrl
}
