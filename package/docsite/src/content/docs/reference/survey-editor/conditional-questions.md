---
title: Conditional Questions
description: How to apply conditions to questions and groups in VeySur so they appear only when specific criteria are met.
---

Conditions let you show or hide a question or group based on how a participant has answered an earlier question. This keeps surveys focused by only presenting questions that are relevant to each participant.

## Where conditions can be applied

A condition on a question controls whether that question is visible. A condition on a group controls whether the entire group, including all questions within it, is visible. A question or group without a condition is always shown.

## Restrictions

Conditions can only reference questions that appear **before** the conditioned element. A question may reference any question that precedes it in the survey, and a group may reference any question from groups that precede it.

This prevents circular dependencies and ensures the referenced answers are always available when the condition is evaluated.

## Opening the condition editor

1. Select the question or group you want to condition.
2. In the attributes panel on the right, find the **Condition** attribute.
3. Click the condition icon (git-branch icon) to open the condition editor.

## Builder mode

Builder mode provides a visual interface for constructing conditions without writing code.

Each condition row begins by selecting the **target type**:

- **Question** - target a question's answer. Then select which earlier question to check. For choice questions, Yes/No questions, and rating-scale questions (star rating, point scales) you can further specify what to match against:
  - A fixed value
  - A specific selected answer option (for choice questions) or predefined option (Yes, No, or a specific rating point)
  - The "Other" free-text value (for choice questions where the participant selected "Other" and provided a custom value)
- **Participant** - target a participant attribute. The list is specific to this survey and includes built-in fields (first name, last name, email, language, token) plus any [custom attributes](/reference/survey-editor/participant-attributes/) defined for it, including internal ones. Then select the value type (text, number, or boolean) and enter the value to match.
- **Response** - target metadata about the response itself, rather than an answer or a participant field. The only field currently available is **Language**, the language the participant is actually completing the survey in.

After selecting the target, choose an **operator** (for example, equals, does not equal, greater than) and provide the comparison value.

Multiple condition rows can be combined using an **AND group** (all conditions must be true) or an **OR group** (at least one condition must be true).

Groups cannot be nested. Complex rules can be created by organising conditions into groups and combining them with AND or OR logic.

As you build the condition, a **preview pane** at the bottom of the editor shows the equivalent JavaScript expression. This is the expression that is actually evaluated at response time.

### Participant language compared with response language

Both the **Participant** and **Response** targets offer a Language field, and they can hold different values.

- **Participant language** is the language recorded on the participant record, usually set when the participant was imported or added. It is a property of the person, and it does not change when they take the survey.
- **Response language** is the language the survey is being displayed in as the participant answers. A participant can switch language while taking the survey, or start in a language other than the one on their record, so this value reflects what they are actually reading.

Use the participant language to branch on the language you expected the participant to use. Use the response language to branch on the language they chose in practice.

## Code mode

Code mode lets you write the condition as a JavaScript expression directly. This is useful for conditions that are difficult to express through the visual builder.

The builder and code views are kept in sync: switching from Builder to Code shows the generated expression, and switching back parses the expression into the visual builder where possible.

## Testing conditions

Use the [Preview](/reference/survey-editor/preview/) tab to verify that your conditions behave as expected. Navigate through the survey, answer the triggering question, and confirm that the conditioned question or group appears or remains hidden as intended.

## Structural edits that affect conditions

Deleting an answer option or subquestion, changing a question's type, or reordering a question or group can invalidate a condition defined elsewhere in the survey. Before such an edit is applied, VeySur checks for this and shows a warning naming the affected condition. Proceeding keeps the condition string in place but marks it invalid; a broken condition is never deleted automatically.

An invalid condition shows a warning icon in the survey editor and in the condition editor. During survey-taking, an invalid condition is treated as absent, so the conditioned question or group always shows. Open the condition editor for the affected question or group to correct the expression.

Invalid conditions also block publishing; see [Publish Your Survey](/guides/publish-your-survey/).

## Related: text expressions

Survey text can use the same variables as conditions to display a dynamic value, rather than to control visibility. See [Text Expressions](/reference/survey-editor/text-expressions/).
