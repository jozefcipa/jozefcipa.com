const fs = require('fs/promises')
const path = require('path')
const { JSDOM } = require('jsdom')
const fm = require('front-matter')
const yaml = require('js-yaml')

/*
 Script flow:
 1. Get exported HTML and process it (get only body, lazy loading images, google maps iframe) - Either in Chrome extension or CI/CD
 2. Check if file for the given key exists, otherwise create a new one
 3. If the file exists, parse the meta data (front matter)
 4. Save a new file content (front matter + processed HTML)
*/

async function loadHTML(filePath) {
    const dom = await JSDOM.fromFile(filePath)
    return {
        body: dom.window.document.getElementsByTagName('body')[0],
        dom,
    }
}

function processHTML(body, dom, opts) {
    // Remove header
    // We don't need title and icon from Notion as we will display our custom header
    const header = body.getElementsByTagName('header').item(0)
    header.parentNode.removeChild(header)
    console.log(`[html] Removed Notion header`)

    // Process <a> links

    const links = body.getElementsByTagName('a')
    for (const link of links) {
        // for some reason Notion URL encodes URLs so they don't work anymore
        link.href = decodeURI(link.href)

        // Replace Google maps links with iframes
        // Notion for some reason exports Google maps as <a> elements
        if (link.href.startsWith('https://www.google.com/maps')) {
            const iframe = dom.window.document.createElement('iframe')
            iframe.setAttribute('src', link.href)
            link.replaceWith(iframe)
        }
    }
    console.log(`[html] Processed href links`)

    // Remove <script> and <link> tags for code highlighting
    const prismScriptLinks = body.querySelectorAll('script[src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"]')
    const prismCssLinks = body.querySelectorAll('link[href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css"]')
    const prismLinks = [...prismScriptLinks, ...prismCssLinks]
    if (prismLinks.length) {
        prismLinks.forEach(link => link.remove())
        console.log(`[html] Deleted ${prismLinks.length} redundant Prism highlighter links`)
    }

    // add lazy loading to images
    if (opts.imgLazyLoad) {
        const images = body.getElementsByTagName('img')
        for (const image of images) {
            const imageSrc = image.getAttribute('src')
            const imageUrlParts = imageSrc.split('/')
            const imageName = imageUrlParts.pop()
            const previewImageSrc = imageUrlParts.join('/') + '/previews/' + imageName
        
            image.setAttribute('data-src', imageSrc)
            image.setAttribute('src', previewImageSrc)
            image.classList.add('lazyload')
        }

        console.log(`[html] Added lazyload image versions`)
    }

    return body.innerHTML
}

function getFilePath(fileName) {
    return path.resolve(__dirname, '../content/blog', `${fileName}.html`)
}

async function getFile(fileName) {
    const filePath = getFilePath(fileName)
    try {
        const fileContent = await fs.readFile(filePath, 'utf8')
        return fileContent.toString()
    } catch {
        return ''
    }
}

async function saveFile(fileName, content) {
    const filePath = getFilePath(fileName)
    await fs.writeFile(filePath, content)
    return filePath
}

function getFrontMatter(content) {
    if (content) {
        return fm(content).attributes
    }

    return {}
}

function updateFrontMatter(frontMatter, updates) {
    return `---
${yaml.dump({
    title: updates.title ?? frontMatter.title ?? 'no-name',
    tags: updates.tags ?? frontMatter.tags ?? [],
    date: frontMatter.date ?? new Date().toISOString(),
    slug: updates.slug ?? frontMatter.slug,
    draft: false,
    // TODO: add preview image
})}---
`
}
// NOTE: if you get weird code formatting, looks for <script> and <link> in the exported Notion HTML
// apparently it started including the script for each <code> block
const title = 'How to do Raspberry Pi OS backups'
const slug = 'how-to-do-raspberry-pi-os-backups'
const fileName = slug
const tags = ['homelab', 'raspberrypi']
const imgLazyLoad = false

;(async (filePath) => {
    if (!filePath) {
        console.error('No file provided!')
        process.exit(1)
    }

    // process HTML
    const { dom, body: htmlBody } = await loadHTML(filePath)
    console.log(`✓ Loaded HTML from ${filePath}`)
    const articleContent = processHTML(htmlBody, dom, { imgLazyLoad })
    console.log(`✓ Processed article content`)

    // if the article already exists, read the file and parse front matter
    const frontMatter = getFrontMatter(await getFile(fileName))

    // TODO: generate article preview image

    // TODO: generate lazy load image previews

    // TODO: export this whole script into a separte binary / github package => notion2hugo

    // TODO: add CLI prompts for the variables above

    // prepare front matter
    const articleMeta = updateFrontMatter(frontMatter, {
        title,
        slug,
        tags,
    })
    console.log(`✓ Generated front matter`)

    // save file
    const content = `${articleMeta}\n${articleContent}`
    const outFilePath = await saveFile(fileName, content)
    console.log(`✓ Article saved to ${outFilePath}`)

})(process.argv[2])
