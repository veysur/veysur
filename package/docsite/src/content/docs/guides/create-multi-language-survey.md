---
title: Create a Multi-Language Survey
description: How to configure a survey in VeySur to support multiple languages.
---

VeySur supports multi-language surveys. You can enter translated content for each question and answer option, and each participant can be assigned a language so they see the survey in their preferred language.

## Step 1: Configure language settings

1. Open your survey and go to **Settings**.
2. Open the **Language** section.
3. Set the **Default language**: this is the fallback used when no translation is available for a participant's language.
4. Add one or more additional languages to the **Language options** list.

Save your changes before returning to the editor.

## Step 2: Enter translated content

Once the survey has more than one language configured, a language selector appears in the survey editor toolbar. Use it to switch between languages while editing.

For each language:

1. Select the language from the selector.
2. Click into any question or answer option text and enter the translated version.
3. Repeat for every question, group description, and answer option in the survey.

Content that has not been translated in a given language falls back to the default language at response time.

## Step 3: Assign languages to participants

When adding participants, the **Language** field determines which language the survey is presented in to that participant.

- Open the **Participants** tab.
- When adding a participant manually or editing an existing record, set the Language field to the appropriate language.
- If importing participants from a file, include the language code in the import data.

Participants can also choose their own language when taking the survey. A language selector is shown to the participant if multiple languages are configured.

## Step 4: Preview in each language

Use the **Preview** tab to check the survey in each language. Select the language from the language selector in the Preview view and navigate through the survey to verify that all text has been translated correctly.

## Statistics and language

In the Statistics tab, question titles and answer option labels are shown in the language currently selected in the editor. If a translation is missing for the selected language, the content falls back to the default language.

## Notes

- Language codes follow the ISO 639-1 standard (for example, `en` for English, `fr` for French, `de` for German).
- The default language should be the language in which you create the survey initially. All other languages are added on top of it.
- Removing a language from the Language options list does not delete the translated content; it simply prevents that language from being offered as an option.
- The editor loads only the active language and the default language at a time. Switching the editing language fetches the new language's content from the server.
