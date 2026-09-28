---
spec: v1
templateName: Adverse event and safety follow-up
templateDescription: Collect structured reports of side effects, tolerability and safety signals after treatment.
templateCategory: Clinical & healthcare research
language:
  default: en
  options: [en]
---

# Adverse Event and Safety Follow-Up

> This survey asks about any side effects or health problems since you started treatment. If you need urgent medical help, contact your doctor or local emergency services now.

## Side effects

### Q001 · yesNo
Have you experienced any new or worsening health problems since starting treatment?

---

### Q002 · checkbox
Which of these have you experienced?

- choiceOther: true
- required: false

Options:
- [ ] A001 · Headache
- [ ] A002 · Nausea or vomiting
- [ ] A003 · Dizziness
- [ ] A004 · Rash or skin reaction
- [ ] A005 · Fatigue
- [ ] A006 · Breathing difficulty
- [ ] A007 · Changes in heart rate

---

### Q003 · date
When did the problem first start?

- required: false

---

### Q004 · dropdown
How severe was the problem at its worst?

- choiceMinMax: { min: 1, max: 1 }
- required: false

Options:
- [ ] A001 · Mild
- [ ] A002 · Moderate
- [ ] A003 · Severe
- [ ] A004 · Life-threatening

## Outcome and action taken

### Q005 · yesNo
Did you need to see a doctor or visit hospital because of the problem?

---

### Q006 · dropdown
What happened to your treatment?

- choiceMinMax: { min: 1, max: 1 }

Options:
- [ ] A001 · No change
- [ ] A002 · Dose reduced
- [ ] A003 · Treatment paused
- [ ] A004 · Treatment stopped

---

### Q007 · point5
How well are you tolerating your treatment overall?

---

### Q008 · text
Please describe the problem in your own words.

- inputSize: large
- required: false

## Thank you

Thank you for reporting. Your answers help us monitor the safety of treatment.
