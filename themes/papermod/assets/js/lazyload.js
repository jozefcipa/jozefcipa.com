window.addEventListener('load', () => {
    const images = document.getElementsByClassName('lazyload')
    for (let i = 0; i < images.length; i++) {
        const fullImageSrc = images[i].getAttribute('data-src')
        if (fullImageSrc) {
            images[i].setAttribute('loading', 'lazy')
            images[i].setAttribute('src', fullImageSrc)
        }
    }
})
