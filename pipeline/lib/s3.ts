import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { config } from './config'
import { log, logApiError } from './log'

let client: S3Client | null = null

const s3 = (): S3Client => {
  client ??= new S3Client({ region: config.awsRegion })
  return client
}

export const uploadAsset = async (key: string, body: Buffer, contentType: string): Promise<string> => {
  log(`s3: uploading ${key} (${contentType}, ${body.length} bytes)`)
  try {
    await s3().send(
      new PutObjectCommand({
        Bucket: config.s3Bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    )
  } catch (error) {
    logApiError(`s3 upload ${key}`, error)
  }
  return `${config.assetsBaseUrl}/${key}`
}
