---
spec: v1
templateName: Course evaluation
templateDescription: Collect learner feedback on a course, covering content, teaching and how much they learned.
language:
  default: en
  options: [en]
---

# Course Evaluation

> Your feedback helps us improve this course for future learners.

## The course

### Q001 · starRating
How would you rate the course overall?

---

### Q002 · point5
The course content was clear and well organised.

---

### Q003 · point5
The course materials were useful.

---

### Q004 · point5
The pace of the course suited me.

## The instructor

### Q005 · point5
The instructor explained topics clearly.

---

### Q006 · point5
The instructor answered questions helpfully.

## Your learning

### Q007 · dropdown
How much prior knowledge of the subject did you have?

- choiceMinMax: { min: 1, max: 1 }

Options:
- [ ] A001 · None
- [ ] A002 · Some
- [ ] A003 · A lot

---

### Q008 · yesNo
Would you recommend this course to someone else?

---

### Q009 · text
What would you change about this course?

- inputSize: large
- required: false

## Thank you

Thank you for your feedback.
