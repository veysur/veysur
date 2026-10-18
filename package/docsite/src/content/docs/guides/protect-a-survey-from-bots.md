---
title: Protect a Survey from Bots
description: Ask participants to pass a bot check before they answer an open survey.
---

## Choose a provider

Bot protection is off by default. Open **Settings > Survey**, find **Bot protection** and choose a provider:

| Provider | Notes |
|---|---|
| VeySur Bot Detection | A proof-of-work check that runs in the participant's browser. No third party is involved. |
| Cloudflare Turnstile | Needs a site key and secret key from Cloudflare. |
| Google reCAPTCHA v3 | Needs a site key and secret key from Google. |

Secret keys are write-only. Leave the field blank to keep the saved key.

A single survey can override the provider, site key and secret key in its own settings. Each value has a default switch that returns it to the project value.

## Switch the check on

Set **Bot check** to Yes under Access Control. Set it in the project settings to cover every survey, or in a single survey's settings to override the project. The check applies after the next publication.

## Participant experience

The check runs on the start step. The Start button stays disabled until it passes. A survey without a welcome message shows a short check step first.

## Privacy

Cloudflare and Google receive browser data when their check runs. Disclose this in your privacy information and obtain consent where the law requires it.
