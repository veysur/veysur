/*
 * VeySur embed loader. Usage:
 *   <script async src="https://<survey domain>/embed/loader.js"
 *           data-survey="<projectId>/<surveyId>" data-lang="en"></script>
 * Inserts a lazy-loaded iframe after the script tag and keeps its height in sync
 * with the survey. Served with a stable filename so pasted snippets keep working.
 *
 * Theme: data-theme="light" (default), "dark" or "auto" (follows the visitor's
 * colour scheme). A host page with its own theme switch can call
 * window.VeySurEmbed.setTheme('light' | 'dark') to change it live.
 *
 * Lazy: add data-lazy to hold the iframe's src back until it is within about
 * 300px of the viewport. Without IntersectionObserver it loads straight away.
 */
;(function () {
  'use strict'

  var RESIZE_MESSAGE = 'veysur:embed:resize'
  var THEME_MESSAGE = 'veysur:embed:theme'
  var script = document.currentScript
  if (!script || !script.src) return

  var survey = script.getAttribute('data-survey') || ''
  if (!/^[\w-]+\/[\w-]+$/.test(survey)) return

  var origin = new URL(script.src, window.location.href).origin
  var lang = script.getAttribute('data-lang')
  if (lang && !/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(lang)) lang = null

  var darkQuery = window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null
  var auto = script.getAttribute('data-theme') === 'auto'

  function normaliseTheme(value) {
    return value === 'dark' ? 'dark' : 'light'
  }

  var theme = auto
    ? darkQuery && darkQuery.matches
      ? 'dark'
      : 'light'
    : normaliseTheme(script.getAttribute('data-theme'))

  var lazy = script.hasAttribute('data-lazy')

  // Read at call time so a theme change made before a lazy load is honoured.
  function surveyUrl() {
    var url = new URL('/embed/' + survey, origin)
    if (lang) url.searchParams.set('lang', lang)
    if (theme === 'dark') url.searchParams.set('theme', 'dark')
    return url.href
  }

  var iframe = document.createElement('iframe')
  iframe.title = script.getAttribute('data-title') || 'Survey'
  iframe.loading = 'lazy'
  // Always tell the survey which site embeds it, whatever the host page's own
  // referrer policy is; the survey checks this against its allowed domains.
  iframe.referrerPolicy = 'origin'
  iframe.style.cssText =
    'display:block;width:100%;height:480px;border:0;overflow:hidden'
  iframe.setAttribute('scrolling', 'no')

  script.parentNode.insertBefore(iframe, script.nextSibling)

  if (lazy && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        if (!entries.some(function (entry) { return entry.isIntersecting })) {
          return
        }
        observer.disconnect()
        iframe.src = surveyUrl()
      },
      { rootMargin: '300px' },
    )
    observer.observe(iframe)
  } else {
    iframe.src = surveyUrl()
  }

  function sendTheme() {
    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: THEME_MESSAGE, theme: theme }, origin)
    }
  }

  function setTheme(value) {
    var next = normaliseTheme(value)
    if (next === theme) return
    theme = next
    sendTheme()
  }

  // A change made while the iframe was still loading would otherwise be lost.
  iframe.addEventListener('load', sendTheme)

  if (auto && darkQuery && darkQuery.addEventListener) {
    darkQuery.addEventListener('change', function (event) {
      setTheme(event.matches ? 'dark' : 'light')
    })
  }

  window.VeySurEmbed = window.VeySurEmbed || {}
  window.VeySurEmbed.setTheme = setTheme

  window.addEventListener('message', function (event) {
    var data = event.data
    if (
      event.origin !== origin ||
      event.source !== iframe.contentWindow ||
      !data ||
      data.type !== RESIZE_MESSAGE ||
      typeof data.height !== 'number'
    ) {
      return
    }
    iframe.style.height = Math.ceil(data.height) + 'px'
  })
})()
