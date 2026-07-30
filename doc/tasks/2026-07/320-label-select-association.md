# 🔨 [Maintainability] Label elements should have a text label and an associated control (typescript:S6853)

## Description

SonarCloud flagged **1** occurrence of rule `typescript:S6853` (Maintainability, MAJOR) in
`sushigo-webapp`: a `<label>` element that is not programmatically associated with its form
control, so assistive technology cannot tell which control the label describes.

## Reason

An unassociated `<label>` breaks the accessible name computation for its control — screen reader
users can't tell what the adjacent `<select>` is for, and it trips SonarCloud's maintainability
gate, blocking a clean quality report for `sushigo-webapp`.

## Objective

The flagged `<label>` in `data-grid.tsx` is associated with its `<select>` control (via
`htmlFor`/`id` or nesting) so assistive technology announces the field correctly, and SonarCloud
no longer reports `typescript:S6853` for this file.

## Affected locations

- `src/components/ui/data-grid.tsx:366`

## Proposed approach

Give the `<label>` visible text content and associate it with its form control via `htmlFor`/nesting so screen readers can announce the field correctly.

## References

- SonarCloud project: [pakodiazdev_sushigo-webapp](https://sonarcloud.io/project/issues?id=pakodiazdev_sushigo-webapp&rules=typescript:S6853)

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `0.5h` · **Pessimistic:** `1h` · **Tracked:** `16m`

### 📅 Sessions
```json
[
  { "date": "2026-07-30", "start": "02:30", "end": "02:46" }
]
```

## 📊 Retrospective
- **Actual total:** 0h 16m (16m)
- **vs optimistic:** −14m
- **vs pessimistic:** −44m

**Justification:**
Straightforward, well-scoped a11y fix: the flagged `<label>`/`<select>` pair was the only
occurrence, `useId()` + `htmlFor`/`id` was the obvious association pattern for a reusable
component that can render multiple instances on a page, and the existing `data-grid.test.tsx`
suite already had a `perPage selector` describe block to extend with a regression test
(`getByLabelText`). No rework, no unexpected edge cases.



