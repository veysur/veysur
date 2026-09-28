---
spec: v1
templateName: Physician and clinician survey
templateDescription: Gather insights from doctors, nurses and specialists on treatment practice, unmet needs and product perceptions.
templateCategory: Clinical & healthcare research
language:
  default: en
  options: [en]
---

# Physician and Clinician Survey

> Thank you for sharing your clinical experience. The survey takes about eight minutes.

## About you

### Q001 · dropdown
Which best describes your role?

- choiceMinMax: { min: 1, max: 1 }
- choiceOther: true

Options:
- [ ] A001 · Physician
- [ ] A002 · Surgeon
- [ ] A003 · Nurse or nurse practitioner
- [ ] A004 · Pharmacist
- [ ] A005 · Allied health professional

---

### Q002 · number
How many years have you been in clinical practice?

- numberMinMax: { min: 0, max: 60 }

---

### Q003 · number
Approximately how many patients with this condition do you see each month?

- numberMinMax: { min: 0, max: 0 }

## Treatment practice

### Q004 · checkbox
Which treatment approaches do you currently use for this condition?

- choiceMinMax: { min: 1, max: 0 }
- choiceOther: true
- choiceRandomise: true

Options:
- [ ] A001 · Lifestyle or behavioural advice
- [ ] A002 · First-line drug therapy
- [ ] A003 · Second-line drug therapy
- [ ] A004 · Device or procedure
- [ ] A005 · Referral to a specialist

---

### Q005 · point5
Current treatment options meet the needs of most of my patients.

Labels:
- 1 · Strongly disagree
- 5 · Strongly agree

---

### Q006 · text
What are the main unmet needs you see in your patients?

- inputSize: large

## Guidelines and information

### Q007 · point5
Clinical guidelines for this condition are clear and easy to apply.

Labels:
- 1 · Strongly disagree
- 5 · Strongly agree

---

### Q008 · text
Where do you usually look for new clinical information?

- inputSize: medium
- required: false

## Thank you

Thank you for your time and expertise.
