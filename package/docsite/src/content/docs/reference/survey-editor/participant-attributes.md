---
title: Participant Attributes
description: "Reference for custom participant attributes: field specs, management operations, and import/export behaviour."
---

VeySur has a fixed set of **system attributes** for every participant: First Name (`nameFirst`), Last Name (`nameLast`), Email (`email`), Language (`language`), and Token (`token`). The names in brackets are the identifiers used when referencing an attribute in a [display condition](/reference/survey-editor/conditional-questions/). For survey-specific data, **custom attributes** can be defined: named string fields (up to 256 characters) scoped to a single survey.

## System vs custom attributes

| | System | Custom |
|---|---|---|
| Predefined | Yes | No, user-defined |
| Per-survey scope | No, shared across all surveys | Yes |
| Multilingual labels | No | Yes |
| Editable in admin forms | Yes | Yes |
| Exported in CSV | Yes | Yes, appended after system columns |
| Internal flag | No | Yes, hides from participant signup |

## Opening the Manage Attributes panel

1. Open your survey and go to the **Participants** tab.
2. Click **Manage Attributes** in the toolbar.

The panel lists system attributes (read-only) followed by any custom attributes you have defined.

## Custom attribute fields

| Field | Description |
|-------|-------------|
| Name | Required. Letters, digits, `_`, `$`; cannot start with a digit; max 64 characters. Cannot shadow a system attribute name or a JavaScript reserved word. |
| Required | If checked, participants must provide this value before submitting the signup form. |
| Internal | If checked, the attribute is admin-only (see [Internal attributes](#internal-attributes)). |
| Example value | Optional hint shown to CSV importers; does not constrain the stored value. |

## Internal attributes

An attribute marked **Internal**:

- Does not appear in the participant signup form.
- Is included in CSV export columns and accepted during CSV import like any other custom attribute.
- Remains readable and editable from the admin Participants tab and via import.

Use this for values you populate via import or API that participants should not see or fill in.

## Attributes in conditions

Both system and custom attribute names — including internal ones — are the identifiers
used when building a display condition. See
[Conditional Questions](/reference/survey-editor/conditional-questions/) for how to
reference them.

## Multilingual labels

Each custom attribute can have a translated label and description per language:

1. Use the language selector at the top of the Manage Attributes panel to switch language.
2. Click the **label** or **description** field for the attribute and enter the translated text.
3. Save the translation.

When the survey-taking flow displays attribute prompts, it uses the participant's assigned language, falling back to the survey's default language, then to the raw attribute `name` if no label is configured.

## Reordering

Drag the handle on the left of each custom attribute row, or use the reorder buttons, to change the order. The order determines the column order in CSV exports.

## Renaming

Click an attribute's name field and edit it. When you leave the field, a confirmation dialog warns you that renaming **updates the stored key in every existing participant record** and cannot be undone.

> **This is destructive.** The old key is removed from all participant records and replaced with the new key. Any CSV or API integrations that reference the old name must be updated.

## Deleting

Click the **Delete** (trash) icon on an attribute row. A confirmation dialog warns you that deletion **permanently removes the stored value from every participant** in this survey and cannot be undone.

> **This is destructive.** All participant records lose the value for this attribute.

## Attributes and publications

When you publish a survey, VeySur freezes the current attribute definitions (names, Required flags, Internal flags, and language labels) into the publication snapshot. Participants who sign up under that publication always see the frozen set.

Changes made after publishing (adding, deleting, renaming, toggling Internal/Required, editing labels) take effect only in new publications; existing active publications are unaffected.

> **Note.** If you add a required attribute after publishing, existing participants are not prompted for it. Create a new publication to apply the updated attribute set.

See [Publications](/reference/survey-editor/publications/) for how snapshots work.

## CSV import/export

The participant CSV export appends one column per custom attribute (by `name`) after the standard system columns. The column header is the attribute `name`, making the file safe to round-trip on re-import.

During import, any column whose header matches a defined custom attribute name is loaded into that attribute on each participant. Values longer than 256 characters are truncated. Existing attribute values on a participant that are **not** present in the CSV are left unchanged (partial update).

See [Invite Participants](/guides/invite-participants/) for full CSV import/export instructions.

## Survey import/export

Custom attribute definitions are included in survey-level exports:

| Format | Attribute definitions |
|--------|----------------------|
| VSST (survey template) | Yes, definitions exported and re-created on import |
| VSSA (full survey archive) | Yes, definitions included alongside publications and responses |
| VSSP (single publication) | Via the publication snapshot |
| CSV (participants) | No, values are exported as columns but the definitions themselves are not included. To import the CSV into a different survey, that survey must already have matching attributes defined. |

This means you can transfer a survey's attribute schema to another survey by exporting as VSST and importing into the new survey.

See [Import / Export](/reference/import-export/) for format details.
