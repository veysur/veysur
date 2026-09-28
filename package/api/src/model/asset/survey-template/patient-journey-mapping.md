---
spec: v1
templateName: Patient journey and unmet need mapping
templateDescription: Trace the patient experience from first symptoms to diagnosis and treatment to find gaps and pain points.
templateCategory: Medical & healthcare market research
language:
  default: en
  options: [en]
---

# Patient Journey and Unmet Need Mapping

> We would like to understand your experience from the first signs of your condition to today. It takes about ten minutes.

## Before diagnosis

### Q001 · date
Roughly when did you first notice symptoms?

---

### Q002 · dropdown
Who did you speak to first about your symptoms?

- choiceMinMax: { min: 1, max: 1 }
- choiceOther: true

Options:
- [ ] A001 · Family doctor
- [ ] A002 · Specialist
- [ ] A003 · Pharmacist
- [ ] A004 · Emergency department
- [ ] A005 · Family or friends

---

### Q003 · number
How many months passed between your first symptoms and a confirmed diagnosis?

- numberMinMax: { min: 0, max: 0 }

---

### Q004 · point5
I felt my symptoms were taken seriously.

## Diagnosis and treatment

### Q005 · point5
My diagnosis was explained in a way I could understand.

---

### Q006 · point5
I was involved in decisions about my treatment.

---

### Q007 · checkbox
Which of these have been a challenge for you?

- choiceOther: true

Options:
- [ ] A001 · Long waits for appointments
- [ ] A002 · Finding reliable information
- [ ] A003 · Cost of treatment
- [ ] A004 · Side effects
- [ ] A005 · Emotional support
- [ ] A006 · Coordination between different clinicians

## Looking ahead

### Q008 · text
What is the biggest gap in your care today?

- inputSize: large

---

### Q009 · text
What one thing would most improve your experience?

- inputSize: large
- required: false

## Thank you

Thank you for sharing your story.
