---
'veysur-app': minor
---

Let a host page choose the embedded survey's theme. The loader accepts `data-theme` (`light`, `dark` or `auto`) and exposes `window.VeySurEmbed.setTheme()` for live changes. The embed no longer reads the shared theme cookie, so it is light unless the host asks otherwise.
