#!/usr/bin/env node
// Generate a blog diagram image via OpenRouter (Gemini Flash image model).
//
// The visual style is locked in the prompt below and anchored with the same
// few-shot examples the pipeline uses for covers (pipeline/lib/cover-examples.ts).
// Unlike covers, diagrams may contain many objects and short labels.
//
// Usage:
//   node .claude/skills/blog-diagram/generate-diagram.ts "<description>" [options]
//
// Options:
//   --name <slug>        output file name prefix (default: derived from the description)
//   --feedback "<text>"  feedback on a previous attempt, folded into the prompt
//   --no-examples        don't attach the cover style examples
//   --no-watermark       skip the "jozefcipa.com" watermark in the bottom-right corner
//
// Output: ./tmp/<name>-<timestamp>.png (path is printed to stdout)
// Requires OPENROUTER_API_KEY (read from the environment or pipeline/.env).

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..')
const OUT_DIR = path.join(REPO_ROOT, 'tmp')
// Pre-watermark originals — --feedback sends the latest one back to the model
// for editing, and it must not contain the baked-in watermark text.
const RAW_DIR = path.join(OUT_DIR, '.raw')
const MODEL = process.env.IMAGE_MODEL ?? 'google/gemini-2.5-flash-image'

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

// Locked style — matches the site theme (white bg, gray line work, one accent:
// --accent #1565C0). The model only decides the scene layout, never the style.
const diagramPrompt = (description: string, feedback?: string, hasPreviousImage = false): string =>
  [
    'Create a technical DIAGRAM illustration for a blog post, in the visual',
    'style of the attached example images.',
    '',
    `The diagram to draw: "${description}"`,
    '',
    ...(feedback
      ? hasPreviousImage
        ? [
            'The FIRST attached image is your previous attempt. It was rejected with',
            `this feedback, respect it: "${feedback}"`,
            'Redraw that image applying ONLY the changes the feedback asks for — keep',
            'its composition, objects and style otherwise unchanged. The remaining',
            'attached images are general style references.',
            '',
          ]
        : [`The previous attempt was rejected with this feedback, respect it: "${feedback}"`, '']
      : []),
    'Unlike the examples, this is a diagram, not a cover: it may contain as many',
    'boxes, devices, arrows and connections as the description needs — clarity',
    'beats sparseness. Use arrows and a simple flow layout to show relationships.',
    '',
    'Style rules — match the attached examples exactly:',
    '- a minimal engineering sketch: thin dark-gray outline strokes on a plain',
    '  white background, like a schematic or patent drawing',
    '- simple silhouettes, no interior detail beyond what makes an object',
    '  recognizable',
    '- monochromatic grays for everything, EXCEPT the most meaningful element(s)',
    '  highlighted in cobalt blue (#1565C0). Use the blue sparingly and',
    '  purposefully — it must draw the eye to the point of the diagram',
    '- flat 2D, clean spacing, landscape composition',
    '',
    'TEXT RULES — keep text to an absolute minimum:',
    '- only short labels of one or two words, and only where a label genuinely',
    '  helps understanding; every label must be spelled exactly as given in the',
    '  description above',
    '- labels are small, dark gray, in plain technical lettering',
    '- no sentences, no titles, no captions, no paragraphs, no logos',
    '- screens and papers in the drawing stay blank or show abstract gray lines',
    '',
    'Never: photorealism, gradients, shading, drop shadows, 3D rendering, or any',
    'color other than grays and the single blue accent.',
  ].join('\n')

const WATERMARK = 'jozefcipa.com'

// Overlay the watermark bottom-right, sized relative to the image width.
// Drawn with sharp (borrowed from pipeline/node_modules) so it's always crisp
// and correctly spelled — the image model never renders it.
const addWatermark = async (image: Buffer): Promise<Buffer> => {
  try {
    const { default: sharp } = await import(
      pathToFileURL(path.join(REPO_ROOT, 'pipeline/node_modules/sharp/lib/index.js')).href
    )
    const { width, height } = await sharp(image).metadata()
    if (!width || !height) return image
    const fontSize = Math.max(14, Math.round(width * 0.016))
    const padding = Math.round(fontSize * 0.9)
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="${width - padding}" y="${height - padding}" text-anchor="end"
        font-family="Menlo, Consolas, monospace" font-size="${fontSize}"
        fill="#9e9e9e">${WATERMARK}</text>
    </svg>`
    return await sharp(image).composite([{ input: Buffer.from(svg) }]).toBuffer()
  } catch (err) {
    console.warn(`warn: could not add the watermark, saving without it (${err})`)
    return image
  }
}

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

// Latest generated image for this name, as a data URL — preferring the raw
// (pre-watermark) copy so the model never sees the watermark text.
const loadLatestImage = async (name: string): Promise<string | null> => {
  for (const dir of [RAW_DIR, OUT_DIR]) {
    const files = (await readdir(dir).catch(() => [] as string[]))
      .filter((file) => file.startsWith(`${name}-`) && /\.(png|jpg|webp)$/.test(file))
      .sort()
    const latest = files.at(-1)
    if (latest) {
      const extension = path.extname(latest).slice(1)
      const data = await readFile(path.join(dir, latest))
      return `data:${CONTENT_TYPE_BY_EXTENSION[extension] ?? 'image/png'};base64,${data.toString('base64')}`
    }
  }
  return null
}

const loadStyleExamples = async (): Promise<string[]> => {
  try {
    const module = await import(pathToFileURL(path.join(REPO_ROOT, 'pipeline/lib/cover-examples.ts')).href)
    return module.COVER_EXAMPLES
  } catch {
    console.warn('warn: could not load pipeline/lib/cover-examples.ts, generating without style examples')
    return []
  }
}

const main = async (): Promise<void> => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      name: { type: 'string' },
      feedback: { type: 'string' },
      'no-examples': { type: 'boolean', default: false },
      'no-watermark': { type: 'boolean', default: false },
    },
  })

  const description = positionals[0]
  if (!description) {
    console.error('usage: node generate-diagram.ts "<description>" [--name <slug>] [--feedback "<text>"] [--no-examples]')
    process.exit(2)
  }

  // OPENROUTER_API_KEY lives in pipeline/.env — load it when not already set
  if (!process.env.OPENROUTER_API_KEY) {
    try {
      process.loadEnvFile(path.join(REPO_ROOT, 'pipeline/.env'))
    } catch {
      // no .env file — rely on the environment
    }
  }
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    console.error('error: OPENROUTER_API_KEY is not set (checked the environment and pipeline/.env)')
    process.exit(1)
  }

  const name = values.name ?? slugify(description)
  const examples = values['no-examples'] ? [] : await loadStyleExamples()

  // With --feedback, send the latest generated image back so the model edits it
  // instead of drawing a brand new one from scratch
  let previousImage: string | null = null
  if (values.feedback) {
    previousImage = await loadLatestImage(name)
    if (!previousImage) {
      console.warn(`warn: --feedback given but no previous image found for "${name}" — generating from scratch`)
    }
  }

  console.log(
    `generating diagram via ${MODEL} (${examples.length} style example(s)${previousImage ? ', editing the previous attempt' : ''})…`,
  )

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: diagramPrompt(description, values.feedback, Boolean(previousImage)) },
            ...(previousImage ? [{ type: 'image_url', image_url: { url: previousImage } }] : []),
            ...examples.map((url) => ({ type: 'image_url', image_url: { url } })),
          ],
        },
      ],
      modalities: ['image', 'text'],
    }),
  })
  if (!response.ok) {
    console.error(`error: OpenRouter returned HTTP ${response.status}: ${await response.text()}`)
    process.exit(1)
  }

  const result = await response.json()
  const dataUrl: string | undefined = result.choices?.[0]?.message?.images?.[0]?.image_url?.url
  const match = dataUrl?.match(/^data:(image\/[a-z+]+);base64,(.+)$/)
  if (!match) {
    console.error(`error: the model returned no image: ${JSON.stringify(result).slice(0, 500)}`)
    process.exit(1)
  }

  const extension = EXTENSION_BY_CONTENT_TYPE[match[1]] ?? 'png'
  const file = path.join(OUT_DIR, `${name}-${Date.now()}.${extension}`)

  const raw = Buffer.from(match[2], 'base64')
  const image = values['no-watermark'] ? raw : await addWatermark(raw)

  // keep the pre-watermark original for future --feedback edit rounds
  await mkdir(RAW_DIR, { recursive: true })
  await writeFile(path.join(RAW_DIR, path.basename(file)), raw)
  await writeFile(file, image)
  console.log(file)
}

await main()
