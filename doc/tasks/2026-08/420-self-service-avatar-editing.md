# ✨ Add self-service avatar editing and complete identity-surface rollout

## Description

Add self-service profile avatar editing and expand the shared `<Avatar>` component across the remaining attendance, payroll, approval, and identity surfaces after the administrator-managed avatar foundation from #401 has shipped.

## Reason

#401 establishes avatar storage, authorization, API serialization, the reusable component, and the administrator employee workflow. Adding a new self-service profile page/endpoint and replacing every text-only identity reference are separate product increments with a much wider frontend regression surface. Tracking them independently keeps #401 deliverable and lets this rollout be planned and validated on its own.

## Objective

Authenticated users can update their own avatar without requiring `users.update`, and all agreed employee/user identity surfaces consistently use the shared `<Avatar>` component with the same image and initials-fallback behavior.

## ✅ Technical Tasks

- [x] 🌐 Add or extend an authenticated self-profile endpoint that accepts `media_gallery_id` and `owner_token`
- [x] 🔒 Authorize self-service attachment only when the gallery belongs to the authenticated user
- [x] 🎨 Add a profile UI where the authenticated user can upload or replace their own avatar
- [x] 🔄 Refresh the auth store immediately after avatar changes so the application header updates without a new login
- [x] 👤 Audit attendance, payroll, approval, request, and navigation surfaces for text-only identity rendering
- [x] 👤 Roll out the shared `<Avatar>` component to the explicitly agreed surfaces
- [x] 🧪 Add feature and Vitest coverage for self-update authorization and each adopted presentation pattern
- [x] 🧪 Add one Cypress happy path for self-service avatar replacement

## 🎯 Acceptance Criteria

- [x] An authenticated user can upload or replace only their own avatar
- [x] A user cannot modify another user's avatar through the self-service endpoint
- [x] The header reflects a self-service avatar change without signing out and back in
- [x] Every identity surface explicitly selected for this issue uses the shared `<Avatar>` component
- [x] Initials fallback remains consistent across every adopted surface
- [x] Relevant PHPUnit, Vitest, and Cypress tests pass

## 🔗 References

- #401 — administrator-managed avatar foundation and reusable component
- #377 — generic media upload system
- `doc/conventions/backend/media-uploads.md`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h` · **Pessimistic:** `6h` · **Tracked:** `1h00m`

### 📅 Sessions
```json
[
  { "date": "2026-08-15", "start": "17:53", "end": "18:53" }
]
```

## 📊 Retrospective
- **Actual total:** 1h00m (1 session: 2026-08-15 17:53→18:53)
- **vs optimistic:** −2h00m (under the 3h optimistic estimate)
- **vs pessimistic:** −5h00m

**Justification:** landed well under both estimates on logged time, but the logged `Sessions[]`
array significantly undercounts real effort — treat the variance above as not meaningful on its
own. The
merge history for this issue (PR #456) spans 27 commits across 2026-08-15 and 2026-08-16 — a full
self-service
avatar UX rework (replacing the multi-photo gallery with a WhatsApp/Instagram-style crop picker), a
security fix (preventing a `users.update` holder from claiming another user's avatar), several
SonarCloud quality-gate fixes, and multiple review-response fixes — none of which has a
corresponding `/start-issue` session entry. Per `doc/conventions/sprints.md` §7, this gap is
recorded here rather than corrected by fabricating additional sessions from commit timestamps.

**Result:** Delivered self-service avatar upload/replace through a new profile UI, refreshed the
auth store immediately after changes so the header updates without re-login, and adopted the
shared `<Avatar>` component across the identified identity surfaces, with PHPUnit, Vitest, and
Cypress coverage.





