# ✨ Build the Platillos (dishes) catalog UI — replaces the /productos stub

## Description

Build the real Platillos (dishes) catalog UI, replacing the empty `/productos` stub
(`code/webapp/src/pages/productos.tsx` — currently just a "Página en construcción" placeholder).

## Reason

`/productos` already has a sidebar entry and a route, but no functionality — this issue is what
actually fills it in, using the backend domain from the dishes backend issue.

## Objective

- List view: dishes grouped/filterable by category, showing photo thumbnail, name, base price,
  active/inactive status
- Create/edit form: name, description, base price, category picker, active toggle, photo upload
  (via the reusable uploader component), and extras configuration — add/remove extra groups, mark
  required/optional and single/multiple selection, add/remove options with their own price
  addition
- Category management (create/reorder/deactivate a `dish_category`) — can be a simpler secondary
  view/dialog rather than a full page
- Per this project's Custom Hook Convention: form/list logic lives in `use-dish-form.ts`/
  `use-dishes-list.ts`, components stay presentation-only
- Per this project's Form Convention: `react-hook-form` + `zod`, no raw `useState` for form fields

## 🔗 References

- Stub being replaced: `code/webapp/src/pages/productos.tsx`
- Depends on #379 (dishes backend domain), #378 (frontend uploader component)

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `5h` · **Pessimistic:** `10h` · **Tracked:** `3h47m`

### 📅 Sessions
```json
[
  { "date": "2026-08-11", "start": "10:03", "end": "13:50" }
]
```

## 📊 Retrospective

**Actual total:** 3h47m (1 session, 2026-08-11 10:03–13:50)

**Variance:** ~1h31m under the 5h optimistic estimate; ~6h31m under the 10h pessimistic estimate.

**Justification:** The estimate was for a UI-only frontend issue on top of an already-closed
backend (#379). The session came in under the optimistic bound despite three sources of scope
that weren't in the original estimate:

- **Backend photo support was actually missing.** `DishResource` exposed no photo field and
  `StoreDishRequest`/`CreateDishController` didn't accept `media_gallery_id` — `MediaAttachmentService`'s
  own docblock already named Dish as a pending adopter of the pattern Item uses, so this issue
  became the point where that adoption actually happened (photo_url, anti-hijack `authorize()`
  check, and — once Devin's review flagged the resulting permission gap — a dedicated
  `dishes.manage-media` permission mirroring `Item`'s).
- **Coverage work.** SonarCloud's new-code gate (≥80%) initially failed at 38.7% because only the
  service layer and the two hooks named in the issue (`use-dish-form`, `use-dishes-list`) had
  tests — the presentational components and the category-manager hook didn't. Closing that gap
  landed the PR at ~94% coverage on the new code.
- **Five rounds of automated review.** Copilot's review (5 threads, all addressed) and five
  Devin/DeepWiki cycles surfaced real defects worth fixing in place rather than deferring:
  a category-reorder algorithm that could shuffle unrelated rows or drift from what was actually
  saved on sparse/duplicate positions (fixed by renumbering the whole list to sequential indices
  instead of swapping two stored values), a categories-fetch failure that blanked the entire
  catalog instead of degrading gracefully, a blank-price input that silently no-op'd instead of
  saving as "no extra charge", and the media-ownership permission gap above. None of these were
  disputes about what the feature should do — all were genuine defects, fixed rather than logged
  under Needs Human Judgment.
- **One more defect found during close-out itself.** The final Devin/DeepWiki re-scan after
  `/finish-pr`'s own squash caught a pre-existing bug that five earlier review rounds had missed:
  pressing Enter while typing an extras group/option name fell through to the outer dish form's
  default submit-on-Enter behavior, saving and closing the whole dish instead of adding the
  extra. Fixed with a scoped `onKeyDown` guard on each quick-add row.

The net effect: more found-and-fixed defects than a typical UI issue at this estimate would
carry, but the fixes were each small and targeted, keeping the session under even the optimistic
bound.


