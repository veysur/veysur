---
title: Embed a Survey in a Website
description: How to show a published survey inside another website with a script tag.
---

An embedded survey appears inside a page on another website. Visitors answer it without leaving the page. Responses are recorded as for any other open survey.

## Requirements

- The survey must be published.
- Open access must be on and Public Registration off. See [Settings](/reference/survey-editor/settings/#access).
- The survey must not contain a file upload question. Such a survey shows a link to the full survey instead.

## Embed a survey

1. Open the survey and go to the **Share** tab.
2. In the **Embed in a Website** card, turn on **Allow this survey to be embedded**.
3. Publish the survey. The code is available once a publication exists.
4. Click **Copy code** and paste it into the page where the survey should appear.

## Restrict the websites

By default any website can embed the survey. To limit this, open **Settings**, then **Access**, and list the websites under **Allowed Websites for Embedding**, one per line. A website also covers its subdomains. A survey can override the project default. An empty override allows any website.

## Apply changes

The embed switch and the allowed websites are fixed when a survey is published. After changing either, publish the survey again. A republished survey reaches embedded pages within about a minute.

Embedded responses do not resume. A visitor who returns to the page starts again.
