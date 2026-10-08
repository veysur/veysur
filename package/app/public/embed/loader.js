/*
 * VeySur embed loader. Usage:
 *   <script async src="https://<survey domain>/embed/loader.js"
 *           data-survey="<projectId>/<surveyId>" data-lang="en"></script>
 * Inserts a lazy-loaded iframe after the script tag and keeps its height in sync
 * with the survey. Served with a stable filename so pasted snippets keep working.
 */
;(function () {
  'use strict'

  var RESIZE_MESSAGE = 'veysur:embed:resize'
  var script = document.currentScript
  if (!script || !script.src) return

  var survey = script.getAttribute('data-survey') || ''
  if (!/^[\w-]+\/[\w-]+$/.test(survey)) return

  var origin = new URL(script.src, window.location.href).origin
  var lang = script.getAttribute('data-lang')

  var iframe = document.createElement('iframe')
  iframe.src =
    origin +
    '/embed/' +
    survey +
    (lang ? '?lang=' + encodeURIComponent(lang) : '')
  iframe.title = script.getAttribute('data-title') || 'Survey'
  iframe.loading = 'lazy'
  // Always tell the survey which site embeds it, whatever the host page's own
  // referrer policy is; the survey checks this against its allowed domains.
  iframe.referrerPolicy = 'origin'
  iframe.style.cssText =
    'display:block;width:100%;height:480px;border:0;overflow:hidden'
  iframe.setAttribute('scrolling', 'no')

  script.parentNode.insertBefore(iframe, script.nextSibling)

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
