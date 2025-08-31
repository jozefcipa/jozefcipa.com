const sharp = require('sharp')
const fs = require('fs')
const { pipeline } = require('stream')
const path = require('path')

// Config
const resizeWidth = 100
const blur = 8

function isImage(filePath) {
  const extension = path.extname(filePath.toLowerCase())
  return ['.jpg', '.jpeg', '.png', '.webp'].includes(extension)
}

;(async (inputDir) => {
  if (!inputDir) {
    console.error('Please provide an input directory containing images (node image-preview.js <inputDir>)')
    return
  }

  const outputDir = path.resolve(__dirname, './previews')
  // ensure output directory exists
  await fs.promises.mkdir(outputDir, { recursive: true })

  const images = (await fs.promises.readdir(inputDir)).filter(isImage)

  for (const img of images) {
    console.log(`Processing ${img}...`)
    const outputFilePath = `${outputDir}/${img}`.toLocaleLowerCase()
    await pipeline(
      fs.createReadStream(`${inputDir}/${img}`),
      sharp().resize({ width: resizeWidth }),
      sharp().blur(blur),
      fs.createWriteStream(outputFilePath),
      (err) => {
        if (err) {
          console.error(err)
        } else {
          console.log(`Preview saved to ${outputFilePath}`)
        }
      },
    )
  }
})(process.argv[2])
