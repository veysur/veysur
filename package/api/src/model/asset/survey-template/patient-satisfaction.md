---
spec: v1
templateName: Patient satisfaction
templateDescription: Assess care quality, communication with providers and the facility, in the style of a patient experience survey.
templateCategory: Clinical & healthcare research
language:
  default: en
  options: [en]
---

# Patient Satisfaction Survey

> Please tell us about your recent visit. Your answers are confidential and help us improve care.

## Your care

### Q001 · starRating
How would you rate your care overall?

---

### Q002 · point5
Doctors and nurses treated you with courtesy and respect.

Labels:
- 1 · Strongly disagree
- 5 · Strongly agree

---

### Q003 · point5
Doctors and nurses listened carefully to you.

Labels:
- 1 · Strongly disagree
- 5 · Strongly agree

---

### Q004 · point5
Doctors and nurses explained things in a way you could understand.

Labels:
- 1 · Strongly disagree
- 5 · Strongly agree

---

### Q005 · yesNo
Did you receive help as soon as you wanted it when you needed it?

## The facility

### Q006 · point5
The area around your room or treatment space was clean.

Labels:
- 1 · Strongly disagree
- 5 · Strongly agree

---

### Q007 · point5
The area around your room or treatment space was quiet at night.

Labels:
- 1 · Strongly disagree
- 5 · Strongly agree

## Leaving the facility

### Q008 · yesNo
Did staff explain the medicines you should take and their side effects?

---

### Q009 · point10
How likely are you to recommend this facility to friends and family?

Labels:
- 1 · Not at all likely
- 10 · Extremely likely

---

### Q010 · text
What could we have done better?

- inputSize: large
- required: false

## Thank you

Thank you for your feedback.
