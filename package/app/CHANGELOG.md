# veysur-app

## 0.11.0

### Minor Changes

- 604457b: Optional bot protection for the survey start step. It is off by default. A project picks a provider (Cloudflare Turnstile, Google reCAPTCHA v3 or VeySur Bot Detection, a built-in proof-of-work check) and switches the bot check on for the project or per survey. Response and file writes need a verified participant token.

  Login also needs a built-in proof-of-work check, on by default, with no setting or third party involved. Set `API_ACCOUNT_BOT_CHECK=false` to turn it off. Scripts that call `POST /auth-email-password/login` directly must fetch a challenge from `POST /bot-protection/challenge`, solve it, and send it as `botCheck`.

- 0ad8e3b: The embed loader accepts a `data-lazy` attribute that holds the survey iframe's `src` back until it is within about 300px of the viewport.
- ab02890: Authors can add a map question in the survey editor and set its provider, starting view, address search, device location, allowed countries and precision. Project owners can set their own Google Maps key in project settings. Response views show a map answer's address or coordinates, with a map on request.
- ab02890: Participants can answer a map question by clicking a pin, searching for a place or using their device location. Maps use OpenStreetMap by default or Google Maps when a key is set. Embedded surveys load no map service until the participant asks for the map.
- ab02890: The statistics page shows a map question as a clustered map of the chosen locations, with the busiest places listed below it.
- ab02890: A map question's starting latitude, longitude and zoom are now optional. Left blank, the map opens on the participant's city, or their country, found from their IP address, or on the world map. Set `API_MAPS_AUTO_LOCATE=false` to turn the lookup off. Anonymous surveys never look the participant up.
- 62c4fed: Open surveys now stop the same browser completing them more than once, using a flag in the browser's local storage, which also works inside embedded surveys. The `preventRepeat` access setting defaults to on and has a switch in the Access settings. The retired `access.repeatCookie` setting, renamed `access.preventRepeat`, is removed from stored data by a migration.
- af85128: Text questions can require an email address, phone number, web address or custom pattern. Phone numbers are checked against the countries the author lists, in national or international format.

### Patch Changes

- ba0b410: The project's Google Maps key and bot-protection settings now live in their own `settingProject` document instead of `settingSurvey`, and the bot-protection secret keys are encrypted at rest. A migration moves existing values and encrypts them, saving a key needs an encryption key to be configured, and the field-encryption rotation task has a second action, `reencryptProjectSettings`, for them. The project settings page saves through `PUT /setting-project/maps` and `PUT /setting-project/bot-protection`, and participant and embed payloads carry the map and bot-check settings as `settingProjectData`.
- ab02890: A map question with no starting view now opens on a guess from the browser's own settings (language region and time zone), never the network address, and opens at street level on the device position when the browser already allows it. Places chosen by search or "Use my location" zoom to street level.
- ab02890: A map question's zoom now applies only together with a starting latitude and longitude, so it no longer overrides the automatic starting view. The editor disables the zoom field until both are set.
- Updated dependencies [ba0b410]
- Updated dependencies [604457b]
- Updated dependencies [ab02890]
- Updated dependencies [ab02890]
- Updated dependencies [ab02890]
- Updated dependencies [ab02890]
- Updated dependencies [ab02890]
- Updated dependencies [62c4fed]
- Updated dependencies [af85128]
  - veysur-common@0.11.0
  - veysur-theme@0.11.0

## 0.10.1

### Patch Changes

- 34fca81: Refresh the lockfile so the release workflow can build the container images. The 0.10.0 release published no images or tarballs because the lockfile did not match the docsite manifest.
- veysur-common@0.10.1
  - veysur-theme@0.10.1

## 0.10.0

### Minor Changes

- 340308f: Let a host page choose the embedded survey's theme. The loader accepts `data-theme` (`light`, `dark` or `auto`) and exposes `window.VeySurEmbed.setTheme()` for live changes. The embed no longer reads the shared theme cookie, so it is light unless the host asks otherwise.
- aa9a88e: Embed a published survey in another website. The Share tab has an embed card with a copyable script tag and an on/off switch (`access.embed`). The allowed websites (`access.embedDomains`) are set in the Access Control settings, as a project default and per survey, and apply on publish. Publishing writes static, cacheable files (an immutable per-language file per snapshot and a short-lived pointer), so a passive page view makes no API or database call; the participant is authenticated only on their first answer. Only open surveys without public registration or file-upload questions can be embedded. A repair task (`surveyEmbedArtefact.repairAll`) rewrites missing files for surveys published before this release.
- 302b339: Add a `loginDefaults` registry slot that lets an extension pre-fill the login form. Without an extension registered the form starts empty, as before.

### Patch Changes

- 88c981a: Fix drag and drop in the survey editor structure panel. Items at the drop position were pushed far out of place while dragging. The dragged item now leaves a dashed placeholder at the drop position and the drag preview is semi-transparent.
- 88c981a: Fix the drag animation in the survey editor structure panel. Items at the drop position were pushed far out of place because a move was applied twice, once by the live reorder and again by the sorting animation. Moves within a group now animate neighbours and apply on drop, the dragged item leaves a dashed placeholder at the drop slot, and the item under the pointer stays visible through a semi-transparent drag preview.
- b23dc3a: Show the number of sections in the survey list as the count of section ids. A survey imported from markdown without a welcome or thank-you section previously showed -1.
- Updated dependencies [aa9a88e]
- Updated dependencies [6172377]
- Updated dependencies [af4bb1a]
  - veysur-common@0.10.0
  - veysur-theme@0.10.0

## 0.9.0

Initial public release. See the [root changelog](../../CHANGELOG.md) for details.
