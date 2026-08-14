# ✨ Add administrator-managed employee avatars with reusable initials fallback

## Description

Add an employee avatar managed from the existing admin employee create/edit flow, reusing the media upload system built in #377. Store the avatar gallery on the linked `User`, expose its primary image through employee/auth responses, and render a deterministic initials-based fallback whenever no image exists.

This first slice deliberately focuses on the existing administrative workflow and a small set of identity surfaces. Self-service profile editing and broad rollout across attendance/payroll views are tracked separately.

## Reason

Employee lists and identity headers currently rely on text-only names. A photo—or a stable initials badge when no photo has been uploaded—makes employees easier to recognize during onboarding and day-to-day operations.

The generic media system already provides upload, gallery ownership, primary-asset selection, and cleanup. The remaining product work is adopting it safely for `User`, integrating it into employee administration, and centralizing visual identity in a reusable component.

## Objective

An administrator with `users.update` can upload or replace the avatar of an employee's linked user while creating or editing that employee. Employee and authenticated-user responses expose the avatar URL. The webapp uses a reusable `<Avatar>` component that displays the uploaded image or a deterministic initials-based fallback in the employee list/detail surfaces and the application header.

## ✅ Technical Tasks

### Backend

- [x] 🔒 Implement `AuthorizesMediaOwnership` on `User`; allow the owner or a user with `users.update` to manage its gallery
- [x] 🔗 Add `HasMediaGallery` to `User` and preserve the existing one-user/one-gallery media contract
- [x] 📝 Add `media_gallery_id` and `owner_token` validation/accessors to the employee create/update requests where a linked `User` is created or updated
- [x] 🔧 Attach the uploaded gallery to the linked `User` inside the existing employee create/update transaction
- [x] 🌐 Expose `avatar_url` in `EmployeeResource.user` and the authenticated `/auth/me` response
- [x] 🔒 Reject attempts by users without `users.update` to attach or replace another user's avatar
- [x] 🧪 Add feature tests for admin attach/replace, unauthorized cross-user access, no-avatar responses, and media ownership

### Frontend

- [x] 🎨 Create reusable `<Avatar>` component with image, deterministic initials fallback, accessible name, and size variants
- [x] 📤 Integrate `MediaGalleryUploader` into the existing admin employee create/edit form
- [x] 🔧 Include `media_gallery_id` and `owner_token` in employee create/update payloads only when an upload exists
- [x] 👤 Render `<Avatar>` in the employee list and employee detail header
- [x] 👤 Render the authenticated user's avatar/fallback in the application header
- [x] 🧪 Add Vitest coverage for fallback determinism, image rendering/error fallback, form payload integration, and updated identity surfaces
- [x] 🧪 Add one Cypress happy path: admin uploads an employee avatar and sees it after save

## 🎯 Acceptance Criteria

- [x] An administrator with `users.update` can upload or replace an employee avatar from the existing employee form
- [x] A user without `users.update` cannot attach or replace another user's avatar
- [x] Employee and `/auth/me` responses expose `avatar_url` without exposing internal media IDs
- [x] Employee list, employee detail header, and application header use the shared `<Avatar>` component
- [x] Missing or broken avatar images render the same deterministic initials fallback for the same user
- [x] Employee creation/editing without an avatar behaves exactly as before
- [x] Relevant PHPUnit, Vitest, and Cypress tests pass

## 🔗 References

- #377 — generic media upload system and ownership contract
- #420 — self-service profile editing and broad avatar rollout
- `doc/conventions/backend/media-uploads.md`
- `App\Models\Item` — current `AuthorizesMediaOwnership` reference
- `EmployeeResource` — employee identity response

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `4h` · **Pessimistic:** `7h` · **Tracked:** `20h25m`

### 📅 Sessions
```json
[
  { "date": "2026-08-12", "start": "20:21", "end": "07:20" },
  { "date": "2026-08-13", "start": "12:20", "end": "20:48" },
  { "date": "2026-08-14", "start": "12:40", "end": "13:38" }
]
```

## 📊 Retrospective

**Tracked:** `20h25m` (3 sessions: 2026-08-12 20:21→07:20 = `10h59m`; 2026-08-13 12:20→20:48 =
`8h28m`; 2026-08-14 12:40→13:38 = `58m`)

**Variance:** +13h25m over the 7h pessimistic estimate (+192%).

Delivered via the fully-autonomous `/issue` pipeline, then carried through two further
review-response sessions as additional automated and manual review surfaced real defects. The core
implementation (backend media adoption on `User`, request wiring, `EmployeeResource`/`/auth/me`
exposure, the `<Avatar>` component, and its integration across the employee form/list/detail
header/app header, plus the full PHPUnit/Vitest/Cypress test suite) landed within the original
estimate in session 1. Every session after that was review-response, not new scope:

- **Session 1 review loop** (`Copilot` + 4 `Devin`/DeepWiki cycles) caught the avatar-attach
  atomicity gap (fixed via an `$afterCreate` transaction callback), `avatar_url` missing from the
  login/register/reset-password response, a redundant post-commit eager-load that silently
  discarded `roles` on create, and a frontend gap letting a non-admin manager hit a confusing 403
  on save.
- **Session 2** responded to a second round of PR review comments plus fresh Devin findings: fixed
  the actual wrong-photo-on-create bug (the earlier session had misdiagnosed it as an unrelated
  signed-URL issue), a silent no-op when attaching an avatar to a user-less employee, a
  soft-deleted-gallery validation gap, a stale-uploader-state leak across employees, and a silently
  swallowed save error. It also designed and shipped a new per-adopter upload-context system
  (`config('media.contexts')`) so avatar uploads are restricted to images while Item/Dish keep
  video — the user supplied the design for this addition directly. A same-session self-review then
  caught and reverted an over-broad fix (cross-attachable gallery detachment) that had silently
  broken Item/Dish's documented gallery-sharing behavior.
- **Session 3** ran `/sonar-review`, fixed two real bugs a follow-up review pass found in the new
  upload-context code (a fail-open security gap — an unresolvable context skipped file-type
  validation entirely instead of rejecting — and a `config()` dot-path `TypeError` on a malformed
  context value), fixed one more silent-failure gap (uploader shown for a user-less employee in
  edit mode), cleared two SonarCloud code smells per sub-project (cognitive complexity, an
  API-quirk lint rule), and closed out via `/finish-pr`.

No scope changes were requested mid-flight beyond the upload-context system (explicitly
user-directed); the rest of the overrun is entirely review-response — a heavier tail than usual,
since several rounds of external automated review (Copilot, Devin/DeepWiki, a separate code-review
agent, SonarCloud) each found genuine, independent defects across three sessions rather than
converging quickly.





