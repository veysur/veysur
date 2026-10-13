---
'veysur-api': patch
---

A survey imported from markdown, or created from a template, now gets a language record for each of its languages. Without one, publishing produced a snapshot with no languages and an embedded survey reported itself unavailable. `importFromStream` also accepts an optional `surveyId` for a markdown survey.
