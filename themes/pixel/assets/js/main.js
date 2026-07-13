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
