// color mode toggle (initial mode is set in <head> before paint)
document.querySelectorAll('.mode-toggle').forEach((button) => {
  button.addEventListener('click', () => {
    const el = document.documentElement
    const next = el.getAttribute('data-mode') === 'dark' ? 'light' : 'dark'
    el.setAttribute('data-mode', next)
    localStorage.setItem('jc.mode', next)
  })
})

// tag map: reveal the long tail
document.querySelectorAll('[data-tag-more]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-tag-extra]').forEach((pill) => pill.classList.remove('is-hidden'))
    button.remove()
  })
})

// code blocks: copy button
document.querySelectorAll('[data-copy-code]').forEach((button) => {
  button.addEventListener('click', async () => {
    const code = button.closest('.code-block')?.querySelector('pre code')
    if (!code) return
    try {
      await navigator.clipboard.writeText(code.innerText)
      button.textContent = 'copied'
      setTimeout(() => { button.textContent = 'copy' }, 1200)
    } catch {}
  })
})

// blur-up images: the markup ships the low-res preview; swap in the full
// image once it's loaded, starting the download near the viewport
const swapToFull = (img) => {
  const full = img.dataset.full
  if (!full) return
  const loader = new Image()
  loader.onload = () => {
    img.src = full
    img.classList.add('is-loaded')
  }
  loader.onerror = () => {
    img.src = full
    img.classList.add('is-loaded')
  }
  loader.src = full
}

const blurUpImages = document.querySelectorAll('img.blur-up')
blurUpImages.forEach((img) => {
  // a missing preview should never leave a broken image behind
  img.addEventListener('error', () => swapToFull(img), { once: true })
})
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          observer.unobserve(entry.target)
          swapToFull(entry.target)
        }
      }
    },
    { rootMargin: '300px' },
  )
  blurUpImages.forEach((img) => observer.observe(img))
} else {
  blurUpImages.forEach(swapToFull)
}
