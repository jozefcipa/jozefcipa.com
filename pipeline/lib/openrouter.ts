import { OpenRouter } from '@openrouter/sdk'
import { z } from 'zod'
import { config } from './config'
import { log, logApiError } from './log'

let client: OpenRouter | null = null

// OPENROUTER_API_KEY is read from the environment by the SDK itself
const openRouter = (): OpenRouter => {
  client ??= new OpenRouter()
  return client
}

const extractText = (content: unknown): string => {
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('The model returned no text content')
  }
  return content
}

export const completeText = async (prompt: string): Promise<string> => {
  log(`openrouter: completeText via ${config.textModel} (${prompt.length} chars)`)
  try {
    const result = await openRouter().chat.send({
      chatRequest: {
        model: config.textModel,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
      },
    })
    const text = extractText(result.choices[0]?.message.content)
    log(`openrouter: completeText done (${text.length} chars)`)
    return text
  } catch (error) {
    logApiError(`openrouter completeText (${config.textModel})`, error)
  }
}

export const completeObject = async <T extends z.ZodType>(input: {
  name: string
  prompt: string
  schema: T
}): Promise<z.infer<T>> => {
  log(`openrouter: completeObject "${input.name}" via ${config.textModel}`)
  try {
    const result = await openRouter().chat.send({
      chatRequest: {
        model: config.textModel,
        messages: [{ role: 'user', content: input.prompt }],
        responseFormat: {
          type: 'json_schema',
          jsonSchema: {
            name: input.name,
            schema: z.toJSONSchema(input.schema),
          },
        },
        stream: false,
      },
    })
    const parsed = input.schema.parse(JSON.parse(extractText(result.choices[0]?.message.content)))
    log(`openrouter: completeObject "${input.name}" done`)
    return parsed
  } catch (error) {
    logApiError(`openrouter completeObject "${input.name}" (${config.textModel})`, error)
  }
}

export interface GeneratedImage {
  data: Buffer
  contentType: string
}

// Image generation goes through chat completions with an image output modality
// (e.g. google/gemini-2.5-flash-image); the image comes back as a base64 data URL
export const generateImage = async (prompt: string): Promise<GeneratedImage> => {
  log(`openrouter: generateImage via ${config.imageModel}`)
  try {
    const result = await openRouter().chat.send({
      chatRequest: {
        model: config.imageModel,
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text'],
        stream: false,
      },
    })

    const dataUrl = result.choices[0]?.message.images?.[0]?.imageUrl.url
    const match = dataUrl?.match(/^data:(image\/[a-z+]+);base64,(.+)$/)
    if (!match) {
      throw new Error(`The image model "${config.imageModel}" returned no image`)
    }

    const image = { data: Buffer.from(match[2], 'base64'), contentType: match[1] }
    log(`openrouter: generateImage done (${image.contentType}, ${image.data.length} bytes)`)
    return image
  } catch (error) {
    logApiError(`openrouter generateImage (${config.imageModel})`, error)
  }
}
