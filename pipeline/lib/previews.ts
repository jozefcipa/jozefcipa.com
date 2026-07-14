import sharp from 'sharp'

// same parameters as the original .bin/image-preview.js blur-up previews
const PREVIEW_WIDTH = 100
const PREVIEW_BLUR = 8

export const makePreview = (image: Buffer): Promise<Buffer> =>
  sharp(image).resize({ width: PREVIEW_WIDTH }).blur(PREVIEW_BLUR).toBuffer()
