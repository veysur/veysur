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

  var params = []
  if (lang) params.push('lang=' + encodeURIComponent(lang))
  if (theme === 'dark') params.push('theme=dark')

  var iframe = document.createElement('iframe')
  iframe.src =
    origin + '/embed/' + survey + (params.length ? '?' + params.join('&') : '')
  iframe.title = script.getAttribute('data-title') || 'Survey'
  iframe.loading = 'lazy'
  // Always tell the survey which site embeds it, whatever the host page's own
  // referrer policy is; the survey checks this against its allowed domains.
  iframe.referrerPolicy = 'origin'
  iframe.style.cssText =
    'display:block;width:100%;height:480px;border:0;overflow:hidden'
  iframe.setAttribute('scrolling', 'no')

  script.parentNode.insertBefore(iframe, script.nextSibling)

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
