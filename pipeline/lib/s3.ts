import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { config } from './config'

let client: S3Client | null = null

const s3 = (): S3Client => {
  client ??= new S3Client({ region: config.awsRegion })
  return client
}

export const uploadAsset = async (key: string, body: Buffer, contentType: string): Promise<string> => {
  await s3().send(
    new PutObjectCommand({
      Bucket: config.s3Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
  return `${config.assetsBaseUrl}/${key}`
}
