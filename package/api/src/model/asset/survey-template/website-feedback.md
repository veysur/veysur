---
spec: v1
templateName: Website feedback
templateDescription: Find out whether visitors could do what they came to do, and what got in their way.
templateCategory: Customer feedback
language:
  default: en
  options: [en]
---

# Website Feedback

> Help us improve our website. This takes about two minutes.

## Your visit

### Q001 · dropdown
What brought you to our website today?

- choiceMinMax: { min: 1, max: 1 }
- choiceOther: true

Options:
- [ ] A001 · Find product information
- [ ] A002 · Buy something
- [ ] A003 · Get support
- [ ] A004 · Read articles or guides
- [ ] A005 · Just browsing

---

### Q002 · yesNo
Did you find what you were looking for?

---

### Q003 · point5
How easy was it to find your way around the site?

Labels:
- 1 · Very difficult
- 5 · Very easy

---

### Q004 · point5
How would you rate the look and feel of the site?

Labels:
- 1 · Very poor
- 5 · Excellent

## Improvements

### Q005 · checkbox
Which areas of the site need the most work?

- choiceOther: true

Options:
- [ ] A001 · Navigation
- [ ] A002 · Page speed
- [ ] A003 · Search
- [ ] A004 · Content
- [ ] A005 · Mobile layout

---

### Q006 · text
Is there anything else you would like to tell us?

- inputSize: large
- required: false

## Thank you

Thank you for helping us improve.
