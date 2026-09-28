---
spec: v1
templateName: Payer and reimbursement research
templateDescription: Collect input from insurers, pharmacy benefit managers and health systems on coverage, formulary access and pricing.
templateCategory: Medical & healthcare market research
language:
  default: en
  options: [en]
---

# Payer and Reimbursement Research

> Thank you for sharing your perspective on coverage decisions. It takes about eight minutes.

## Your organisation

### Q001 · dropdown
Which best describes your organisation?

- choiceMinMax: { min: 1, max: 1 }
- choiceOther: true

Options:
- [ ] A001 · Health insurer
- [ ] A002 · Pharmacy benefit manager
- [ ] A003 · Hospital or health system
- [ ] A004 · Government or public payer

---

### Q002 · number
Approximately how many covered lives does your organisation manage?

- numberMinMax: { min: 0, max: 0 }

## Coverage decisions

### Q003 · checkbox
Which factors matter most when deciding whether to cover a new treatment?

- choiceMinMax: { min: 1, max: 3 }
- choiceRandomise: true

Options:
- [ ] A001 · Clinical effectiveness
- [ ] A002 · Cost-effectiveness
- [ ] A003 · Budget impact
- [ ] A004 · Size of the eligible population
- [ ] A005 · Availability of alternatives
- [ ] A006 · Safety profile

---

### Q004 · point5
Prior authorisation is an effective way to manage use of high-cost treatments.

---

### Q005 · dropdown
Where would you most likely place a new treatment on your formulary?

- choiceMinMax: { min: 1, max: 1 }

Options:
- [ ] A001 · Preferred tier
- [ ] A002 · Non-preferred tier
- [ ] A003 · Specialty tier
- [ ] A004 · Not covered

## Pricing

### Q006 · point5
Outcomes-based pricing agreements are attractive to my organisation.

---

### Q007 · text
What evidence would most influence your coverage decision?

- inputSize: large

## Thank you

Thank you for your time and insight.
