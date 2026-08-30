# ✨ Suggest semantic codes for Purchase Presentation Templates

**Labels:** enhancement, backend, frontend, sprint-6, investment: product

# ✨ Suggest semantic codes for Purchase Presentation Templates

## Description

Generate an editable semantic code for a Purchase Presentation Template from its package type and base-unit quantity instead of requiring the operator to compose codes such as `BOX_24` manually.

This is contextual generation, not a generic sequence. The initial candidate should describe the reusable commercial package:

```text
Package type    Base quantity    Candidate
───────────────────────────────────────────
BOX             24               BOX_24
PACK            6                PACK_6
TRAY            12               TRAY_12
UNIT            1                UNIT_1
```

If that semantic code already exists, SushiGo should propose a deterministic disambiguated value rather than failing only after submit. The implementation must define whether the compatible UOM participates in disambiguation (for example, `BOX_24_KG`) before falling back to a numeric suffix. This matters because templates are global and reusable, while the same package shape/quantity may be valid for different compatible dimensions.

```text
┌─ Nueva plantilla de presentación ──────────┐
│ Tipo de empaque      [ Caja          ▾ ]  │
│ Cantidad base        [ 24              ]  │
│ Unidad compatible    [ Kilogramo     ▾ ]  │
│                                               │
│ Código *             [ BOX_24_KG       ] [↻]│
│ Sugerido automáticamente; puedes modificarlo.│
└────────────────────────────────────────────────┘
```

## Reason

Presentation Template codes are administrative but semantic: `BOX_24` conveys more operational value than `PRES-014`. The form already collects every input needed to derive a useful candidate. Automatic suggestion reduces inconsistent casing/separators and manual duplicate retries while retaining the operator's ability to follow an existing naming convention.

Because package type, quantity, and compatible UOM become restricted after assignment history exists, automatic generation belongs only to create mode. Editing a persisted template must not rename it merely because its fields rerender or a suggestion endpoint is called.

## Objective

Creating a Purchase Presentation Template proposes a deterministic, descriptive, available code from its package configuration and safely recovers from a concurrent collision without overwriting manual input.

## ✅ Technical Tasks

### Product/contract decisions

- [x] 📝 Define the semantic composition order and normalization for package type, decimal quantities, and compatible UOM.
- [x] 📝 Decide the collision order: base candidate, UOM-qualified candidate, then numeric suffix.
- [x] 🪦 Confirm whether soft-deleted template codes may be suggested again; default to historical non-reuse unless explicitly justified.

### Backend

- [x] 🌐 Add a permission-protected Template code suggestion endpoint accepting package type, quantity, and compatible UOM.
- [x] 🛡️ Keep the partial unique index as the final authority and return the shared collision response contract.
- [x] 📚 Document examples, decimal normalization, maximum-length behavior, and collision resolution in OpenAPI/architecture.

### Frontend

- [x] ✨ Generate/update the suggestion while relevant fields change and the code remains untouched.
- [x] ✍️ Stop automatic replacements after manual code edits.
- [x] 🔄 Add an explicit regenerate action.
- [x] ⚠️ Handle create-time collisions without silent retry or manual-value overwrite.
- [x] 🌐 Present labels, package options, hints, buttons, and errors in Spanish.

### Tests

- [x] 🧪 Cover every package type, integer/decimal quantities, UOM disambiguation, collisions, soft deletion, and maximum length.
- [x] 🧪 Cover create versus edit behavior, manual override, and regeneration in Vitest.
- [x] 🧪 Cover collision response handling.
- [x] 🧪 Add one Cypress happy path creating a Template with the suggested code.

## 🎯 Acceptance Criteria

- [x] Create mode proposes a semantic code after sufficient package context is selected.
- [x] Equivalent normalized inputs produce the same initial candidate.
- [x] The algorithm resolves an existing semantic code deterministically.
- [x] Manual codes remain supported and are never overwritten automatically.
- [x] Edit mode never renames a persisted Template automatically.
- [x] A concurrent collision returns a Spanish error and a new candidate, requiring explicit resubmission.
- [x] Codes remain within the existing 50-character database/API limit.

## 🔗 References

- Purchase Presentation Template contract/UI: #426 and #427.
- Product catalog architecture: #421.
- Shared collision interaction: #497.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `5h` · **Pessimistic:** `10h` · **Tracked:** `0h 0m`

### 📅 Sessions
```json
[]
```

## 📊 Retrospective
- **Actual total:** 0h 0m (no recorded sessions)
- **vs optimistic:** −5h 0m
- **vs pessimistic:** −10h 0m

**Justification:**
The Sessions array remained empty, so the convention requires a tracked total of zero and the recorded duration cannot represent the implementation effort. The delivered scope also went through an additional review-response cycle covering quantity bounds, contextual suggestion invalidation, request debouncing, empty UOM tokens, and recoverable collision feedback; those changes are captured in the PR history and tests, but no session timestamps exist from which to reconstruct their duration without inventing data.

