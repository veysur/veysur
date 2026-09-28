# Survey templates

An admin can create a survey from a built-in template instead of starting blank. Templates are
survey markdown documents (see [survey-markdown-format.md](./import-export/survey-markdown-format.md))
shipped with the API in `src/model/asset/survey-template/<id>.md`. The id is the filename without `.md`.
`copy-assets` copies the directory into `dist/`.

## Adding a template

Add a `.md` file. Beyond the normal markdown format it needs three extra front matter keys, which the
markdown parser ignores:

```markdown
---
spec: v1
templateName: Customer satisfaction
templateDescription: Measure how happy customers are with a product or service.
templateCategory: Customer feedback
language:
  default: en
  options: [en]
---
```

All three keys are required: `SurveyTemplateLoader` throws on a template without them. Include a welcome
blockquote and a `## Thank you` section so a template-created survey has the same welcome, group and
thank-you sections as a blank one. `SurveyTemplateLoader.test.ts` parses and validates every shipped template.

## API

- `GET /survey/template/list` returns `[{ id, name, description, category, questionCount }]`.
- `POST /survey` accepts an optional body field `templateId` beside `survey`. With it,
  `ServiceSurvey.create` runs the markdown import path (parse, resolve, persist) and uses `survey.name`
  as the survey name and default-language title. An unknown id is a 400.
