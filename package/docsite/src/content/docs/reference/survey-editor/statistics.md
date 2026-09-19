---
title: Statistics
description: How to view and configure response statistics and charts in VeySur.
---

The Statistics tab shows a visual summary of collected responses. Charts appear for multiple choice questions, matrix checkbox, matrix yes/no, and matrix number questions, Multi-Part questions other than Multi-Part Text, and ranking questions. Other question types are not shown.

## Selecting a publication and filtering

Statistics are shown for a specific publication, selected from the dropdown at the top of the page; a badge shows the total number of responses included. The same **date range** and **completion status** filters as the Responses tab apply here, plus a search bar to find responses by ID, name, or email.

## Question cards

Each question is shown as a card containing its title (with formatting removed), the total responses received, and a chart of the answer distribution. Questions with no responses still appear, with a zero count.

## Chart settings

A settings icon on each card opens a popover with a **chart type** selector and, where the chart type supports it, a **count / percentage** toggle. Both are saved per question and shared with other administrators.

| Question type | Chart types |
|---|---|
| Single-choice | Bar, horizontal bar, pie |
| Multi-select checkbox, matrix checkbox | Bar, horizontal bar |
| Matrix yes/no, Multi-Part yes/no, Stars, 5-Point, 10-Point | Bar, horizontal bar, stacked bar, pie grid |
| Matrix/Multi-Part number | Bar, horizontal bar (average value per group) |
| Ranking | Bar, horizontal bar, stacked bar, average rank |

Pie grid shows one small pie per subquestion/part; pie, pie grid, and stacked bar always show percentage share. For matrix yes/no, where each cell is an independent answer, the stacked bar and pie grid break every cell into Yes, No, and Not answered. For ranking: **Rank distribution** (bar) counts participants by rank position per option; **Rank profile** (stacked bar) shows each option's mix of positions; **Average rank** shows the mean rank per option, lower being ranked higher.

Charts show tooltips with the count and percentage per option. Matrix and Multi-Part questions also show a table with the exact figure for each pair, split into Yes and No counts for matrix yes/no.

## Multi-language surveys

Question titles and answer option labels appear in the language selected via the language selector at the top of the page, falling back to the survey's default language where no translation exists.
