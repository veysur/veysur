---
spec: v1
templateName: Event feedback
templateDescription: Gather reactions to a conference, workshop or meetup, including venue, content and what to run next time.
templateCategory: Events
language:
  default: en
  options: [en]
---

# Event Feedback Survey

> Thank you for attending. Please tell us what worked and what did not.

## The event

### Q001 · starRating
How would you rate the event overall?

---

### Q002 · point5
How relevant was the content to you?

Labels:
- 1 · Not at all relevant
- 5 · Extremely relevant

---

### Q003 · point5
How would you rate the venue and facilities?

Labels:
- 1 · Very poor
- 5 · Excellent

---

### Q004 · point5
How well was the event organised?

Labels:
- 1 · Very poorly
- 5 · Very well

## Looking ahead

### Q005 · checkbox
Which sessions did you find most useful?

- choiceOther: true

Options:
- [ ] A001 · Keynote talks
- [ ] A002 · Workshops
- [ ] A003 · Panel discussions
- [ ] A004 · Networking time

---

### Q006 · yesNo
Would you attend a similar event in future?

---

### Q007 · text
Which topics would you like us to cover next time?

- inputSize: large
- required: false

## Thank you

Thank you for your feedback. We hope to see you again.
