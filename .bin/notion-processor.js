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

function processHTML(body, dom) {
    // Remove header
    // We don't need title and icon from Notion as we will display our custom header
    const header = body.getElementsByTagName('header').item(0)
    header.parentNode.removeChild(header)

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

    // add loading="lazy" to images
    // TODO: make this optional, only if enabled, turned off by default
    // const images = body.getElementsByTagName('img')
    // for (const image of images) {
    //     const imageSrc = image.getAttribute('src')
    //     const imageUrlParts = imageSrc.split('/')
    //     const imageName = imageUrlParts.pop()
    //     const previewImageSrc = imageUrlParts.join('/') + '/previews/' + imageName
    //
    //     image.setAttribute('data-src', imageSrc)
    //     image.setAttribute('src', previewImageSrc)
    //     image.classList.add('lazyload')
    // }

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
    draft: this.title === 'unnamed',
})}---
`
}

// TODO: we will need to get this from Notion
// these are request parameters
const fileName = 'notion-193b001e58e1412e81d208722f6a6b11' // second part of the URL string
const title = 'Publishing a Go binary with Homebrew'
const slug = 'publishing-go-binary-with-homebrew' // first part of the URL string
const tags = ['golang']

;(async (filePath) => {
    if (!filePath) {
        console.error('No file provided!')
        process.exit(1)
    }

    // process HTML
    const { dom, body: htmlBody} = await loadHTML(filePath)
    const articleContent = processHTML(htmlBody, dom)

    // if the article already exists, read the file and parse front matter
    const frontMatter = getFrontMatter(await getFile(fileName))

    // prepare front matter
    const articleMeta = updateFrontMatter(frontMatter, {
        title,
        slug,
        tags,
    })

    // save file
    const content = `${articleMeta}\n${articleContent}`
    await saveFile(fileName, content)
})(process.argv[2])
