import { OpenRouter } from '@openrouter/sdk'
import { z } from 'zod'
import { config } from './config'

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
  const result = await openRouter().chat.send({
    chatRequest: {
      model: config.textModel,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    },
  })
  return extractText(result.choices[0]?.message.content)
}

export const completeObject = async <T extends z.ZodType>(input: {
  name: string
  prompt: string
  schema: T
}): Promise<z.infer<T>> => {
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
  return input.schema.parse(JSON.parse(extractText(result.choices[0]?.message.content)))
}

export interface GeneratedImage {
  data: Buffer
  contentType: string
}

// Image generation goes through chat completions with an image output modality
// (e.g. google/gemini-2.5-flash-image); the image comes back as a base64 data URL
export const generateImage = async (prompt: string): Promise<GeneratedImage> => {
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

  return { data: Buffer.from(match[2], 'base64'), contentType: match[1] }
}
