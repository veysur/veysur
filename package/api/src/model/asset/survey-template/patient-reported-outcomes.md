---
spec: v1
templateName: Patient-reported outcomes
templateDescription: Capture patients' own assessments of symptoms, functional status and quality of life.
templateCategory: Clinical & healthcare research
language:
  default: en
  options: [en]
---

# Patient-Reported Outcomes Survey

> This survey asks how you have been feeling. There are no right or wrong answers. It takes about five minutes.

## Symptoms

### Q001 · point10
How severe have your symptoms been over the past week?

Labels:
- 1 · Very mild
- 10 · Very severe

---

### Q002 · checkbox
Which symptoms have you experienced in the past week?

- choiceOther: true

Options:
- [ ] A001 · Pain
- [ ] A002 · Fatigue
- [ ] A003 · Nausea
- [ ] A004 · Shortness of breath
- [ ] A005 · Sleep problems
- [ ] A006 · Low mood or anxiety

---

### Q003 · dropdown
How often have symptoms interfered with your daily activities?

- choiceMinMax: { min: 1, max: 1 }

Options:
- [ ] A001 · Never
- [ ] A002 · Rarely
- [ ] A003 · Sometimes
- [ ] A004 · Often
- [ ] A005 · Always

## Function and quality of life

### Q004 · point5
I have been able to carry out my usual daily activities.

Labels:
- 1 · Strongly disagree
- 5 · Strongly agree

---

### Q005 · point5
I have been able to walk and move around without difficulty.

Labels:
- 1 · Strongly disagree
- 5 · Strongly agree

---

### Q006 · point5
My symptoms have affected my mood and emotional wellbeing.

Labels:
- 1 · Strongly disagree
- 5 · Strongly agree

---

### Q007 · point10
How would you rate your overall quality of life this week?

Labels:
- 1 · Very poor
- 10 · Excellent

## Comments

### Q008 · text
Is there anything else about your health you would like us to know?

- inputSize: large
- required: false

## Thank you

Thank you for completing this survey. Your answers help us understand how treatment affects patients.
