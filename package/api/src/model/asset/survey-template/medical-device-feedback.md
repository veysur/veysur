---
spec: v1
templateName: Medical device and diagnostics feedback
templateDescription: Evaluate usability, performance and satisfaction with a device, instrument or diagnostic tool.
templateCategory: Medical & healthcare market research
language:
  default: en
  options: [en]
---

# Medical Device and Diagnostics Feedback

> Please tell us about your experience using this device or test. It takes about five minutes.

## Using the device

### Q001 · dropdown
How often do you use this device or test?

- choiceMinMax: { min: 1, max: 1 }

Options:
- [ ] A001 · Daily
- [ ] A002 · Weekly
- [ ] A003 · Monthly
- [ ] A004 · Rarely

---

### Q002 · point5
The device was easy to set up.

Labels:
- 1 · Strongly disagree
- 5 · Strongly agree

---

### Q003 · point5
The instructions were clear.

Labels:
- 1 · Strongly disagree
- 5 · Strongly agree

---

### Q004 · point5
The device is comfortable and practical to use.

Labels:
- 1 · Strongly disagree
- 5 · Strongly agree

## Performance

### Q005 · point5
The results were accurate and consistent.

Labels:
- 1 · Strongly disagree
- 5 · Strongly agree

---

### Q006 · yesNo
Have you had any technical faults or errors?

---

### Q007 · text
Please describe any faults or difficulties.

- inputSize: large
- required: false

## Overall

### Q008 · starRating
How would you rate the device overall?

---

### Q009 · point10
How likely are you to recommend it to a colleague or another patient?

Labels:
- 1 · Not at all likely
- 10 · Extremely likely

## Thank you

Thank you for your feedback.
