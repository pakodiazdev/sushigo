# ✨ Build a reusable media gallery uploader component (frontend)

## Description

Build a reusable frontend component that wraps the upload-first/attach-on-save media flow (backend
side of this pattern is scoped separately) so any form — Dish photos, Employee/User avatars, Item
resale photos — can embed image upload without re-implementing the gallery-tracking logic each
time.

## Reason

Without a shared component, every future form that needs images would re-invent: picking/dropping
files, calling the upload endpoint, tracking the resulting `media_gallery_id` across re-renders,
showing thumbnails, letting the user reorder/remove/pick a primary image before the parent entity
is even saved. Building it once now, per this project's Custom Hook Convention (logic in
`use-media-gallery-uploader.ts`, presentation in the component), means every consumer gets the
same behavior for free.

## Objective

- A `<MediaGalleryUploader />` component (name open to refinement) that: accepts drag-drop or
  file-picker input, calls the upload endpoint, shows thumbnails as they land, supports
  reorder/remove/mark-primary, and exposes the resulting `media_gallery_id` value to the parent
  form (wired via `react-hook-form`, per this project's Form Convention)
- Works standalone in a "new entity" form before that entity has been saved (no `attachable`
  target yet) — the component only ever talks to the gallery, never to the owning entity
- At least one real consumer wired end-to-end to prove the pattern — recommend Item resale photos
  first (existing entity, lowest-risk place to validate), with Dish/Employee adoption following in
  their own issues once this lands

## 🔗 References

- Depends on #377 (backend upload system)
- Custom Hook Convention: `CLAUDE.md` → "Custom Hook Convention"
- Form Convention: `CLAUDE.md` → "Form Convention"

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h` · **Pessimistic:** `6h` · **Tracked:** `29h 55m`

### 📅 Sessions
```json
[
  { "date": "2026-08-05", "start": "21:25", "end": "23:59" },
  { "date": "2026-08-06", "start": "00:00", "end": "23:59" },
  { "date": "2026-08-07", "start": "00:00", "end": "03:20" }
]
```

## 📊 Retrospective
- **Actual total:** 29h 55m (155m + 1440m + 200m)
- **vs optimistic:** +26h 55m
- **vs pessimistic:** +23h 55m

**Justification:**
The majority of the elapsed wall-clock time (~15h 18m) was spent blocked on an external GitHub
Actions infrastructure outage entirely unrelated to this PR's code — five workflow jobs got stuck
in a broken `queued` state for over 15 hours (confirmed against other branches' CI running
normally during the same window), and GitHub itself refused to cancel them
("Cannot cancel a workflow re-run that has not yet queued"). Resolved by pushing an empty retrigger
commit to force fresh workflow runs once the underlying outage cleared.

Excluding that outage, active engineering time was roughly 14h 30m, still well above the
pessimistic estimate. This was driven by the unattended `/issue` pipeline's own design: it runs the
Devin/DeepWiki automated review to its full 5-cycle safety cap rather than stopping at the first
clean pass, and every one of those 5 rounds surfaced a genuine, fixable issue — lost primary-photo
badge after delete, thumbnail controls not respecting the disabled state, batch-upload abort
semantics, an unsafe concurrent PATCH reorder that could corrupt server-side ordering, a
request/response type conflation on `Item`, keyboard-inaccessible controls, and a reorder race
condition from rapid double-clicks — each requiring its own fix, test, commit, and a full
CI+Copilot+Devin re-validation pass before the next round could start. On top of that, this issue
built an entirely new domain (the upload-first/attach-on-save gallery pattern's frontend half) from
zero, landing 100 tests and a Cypress E2E spec — more thorough coverage than a 3–6h estimate for "a
single reusable component" reasonably anticipated once the review-response cost is factored in.




