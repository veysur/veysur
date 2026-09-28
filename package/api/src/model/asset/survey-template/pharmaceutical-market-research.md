---
spec: v1
templateName: Pharmaceutical market research
templateDescription: Explore prescriber and patient attitudes to drugs, treatment pathways and barriers to adoption.
templateCategory: Medical & healthcare market research
language:
  default: en
  options: [en]
---

# Pharmaceutical Market Research

> Thank you for taking part. We are interested in your honest views on treatment options. It takes about ten minutes.

## Current practice

### Q001 · dropdown
Which treatment do you prescribe most often for this condition?

- choiceMinMax: { min: 1, max: 1 }
- choiceOther: true
- choiceRandomise: true

Options:
- [ ] A001 · Product A
- [ ] A002 · Product B
- [ ] A003 · Product C

---

### Q002 · number
Out of 10 new patients, how many would you start on that treatment?

- numberMinMax: { min: 0, max: 10 }

---

### Q003 · checkbox
What most influences your choice of treatment?

- choiceMinMax: { min: 1, max: 3 }
- choiceRandomise: true
- choiceOther: true

Options:
- [ ] A001 · Clinical efficacy
- [ ] A002 · Safety and tolerability
- [ ] A003 · Ease of administration
- [ ] A004 · Cost and access
- [ ] A005 · Guideline recommendation
- [ ] A006 · Patient preference

## New treatments

### Q004 · point5
There is a need for new treatment options for this condition.

---

### Q005 · point10
How likely would you be to prescribe a new treatment with proven benefits over current options? (1 is very unlikely, 10 is very likely)

---

### Q006 · checkbox
What would stop you prescribing a new treatment?

- choiceOther: true

Options:
- [ ] A001 · Limited long-term data
- [ ] A002 · Restricted reimbursement
- [ ] A003 · Complex monitoring
- [ ] A004 · Safety concerns
- [ ] A005 · Patient reluctance

---

### Q007 · text
What would make a new treatment stand out from those you use now?

- inputSize: large
- required: false

## Thank you

Thank you for your time and views.
