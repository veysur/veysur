---
spec: v1
templateName: Real-world evidence
templateDescription: Capture how treatments perform in everyday clinical practice, outside controlled trial settings.
templateCategory: Clinical & healthcare research
language:
  default: en
  options: [en]
---

# Real-World Evidence Survey

> This survey asks about your experience of treatment in everyday life. It takes about six minutes.

## Your treatment

### Q001 · dropdown
How long have you been on your current treatment?

- choiceMinMax: { min: 1, max: 1 }

Options:
- [ ] A001 · Less than 3 months
- [ ] A002 · 3 to 6 months
- [ ] A003 · 6 to 12 months
- [ ] A004 · More than 12 months

---

### Q002 · yesNo
Have you taken your treatment exactly as prescribed?

---

### Q003 · checkbox
If you have missed doses, why?

- choiceOther: true
- required: false

Options:
- [ ] A001 · Forgot
- [ ] A002 · Side effects
- [ ] A003 · Cost
- [ ] A004 · Ran out of medicine
- [ ] A005 · Felt better

## Results in daily life

### Q004 · point5
My condition is better controlled than before I started this treatment.

Labels:
- 1 · Strongly disagree
- 5 · Strongly agree

---

### Q005 · point5
I can fit this treatment into my daily routine.

Labels:
- 1 · Strongly disagree
- 5 · Strongly agree

---

### Q006 · number
In the past three months, how many times did you need unplanned medical care for your condition?

- numberMinMax: { min: 0, max: 0 }

---

### Q007 · yesNo
Have you changed treatment since you started?

## Comments

### Q008 · text
How has the treatment worked in your daily life?

- inputSize: large
- required: false

## Thank you

Thank you for sharing your experience.
