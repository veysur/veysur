---
spec: v1
templateName: Customer satisfaction
templateDescription: Measure how happy customers are with a product or service, and collect suggestions for improvement.
templateCategory: Customer feedback
language:
  default: en
  options: [en]
---

# Customer Satisfaction Survey

> Thank you for taking the time to share your experience. It takes about three minutes.

## Your experience

### Q001 · starRating
How would you rate your overall experience?

---

### Q002 · point5
How satisfied are you with the quality of our product or service?

---

### Q003 · point5
How satisfied are you with the help you received from our team?

---

### Q004 · yesNo
Would you recommend us to a friend or colleague?

## Your feedback

### Q005 · dropdown
Which part of our service matters most to you?

- choiceMinMax: { min: 1, max: 1 }

Options:
- [ ] A001 · Quality
- [ ] A002 · Price
- [ ] A003 · Speed
- [ ] A004 · Customer support
- [ ] A005 · Ease of use

---

### Q006 · text
What could we do better?

- inputSize: large
- required: false

## Thank you

Thank you for your feedback. It helps us improve.
