# ✨ Build a unified media upload system (Storage-backed, cloud-swappable)

## Description

Build the missing piece of the media system: an upload Controller/Service that lets any entity
(Item, Employee, User, and the upcoming Dish catalog) attach one or more images, stored behind a
cloud-swappable interface. The data model for this already exists and needs no changes —
`MediaGallery`/`MediaAsset`/`MediaAttachment` (`code/api/app/Models/`) are already migrated,
polymorphic (`MediaAttachment.attachable_type`/`attachable_id` can point at any model), and
`Item` already has `mediaAttachments()`/`primaryMediaGallery()` wired. What's missing is the
actual upload endpoint and its attach-to-entity flow.

## Reason

No upload endpoint exists today (`routes/api/*.php` has zero references to `media`). Employees,
Users, and the upcoming Dish catalog all need image support, and building one unified mechanism
now — instead of a bespoke upload path per entity later — is cheaper and keeps the "swap cloud
provider without touching business code" property in one place. `config/filesystems.php` already
has `local`/`public`/`s3` disks scaffolded, so Laravel's Storage/Flysystem abstraction already
satisfies the "configure and migrate between clouds easily" requirement — no new abstraction
needs inventing, just the endpoint built on top of it.

## Objective

- A file can be uploaded **before its owning entity exists yet** (e.g. mid-way through a "New
  Dish" form) and returns a `media_gallery_id` the frontend holds onto
- Uploading a second/third file against that same `media_gallery_id` adds more `MediaAsset` rows
  to the same gallery, not a new one
- When the owning entity is finally saved, passing that `media_gallery_id` creates the
  `MediaAttachment` linking the gallery to the entity — this is the only point where the
  attachment is created
- Assets within a gallery can be reordered (`position`) and one marked `is_primary`
- Uploads write through `Storage::disk(config('filesystems.default'))` — no hardcoded disk name
  anywhere in the new code, so switching cloud providers later is a config change only
- All new endpoints are documented in Swagger (`l5-swagger:generate`)

## ✅ Technical Tasks

- [x] 🔧 `POST /media/upload` — accepts a file + optional existing `media_gallery_id`. If no
      `media_gallery_id` is given, creates a new (still-unattached) `MediaGallery` first. Validates
      mime type/size, stores via `Storage`, creates the `MediaAsset`, returns
      `{ gallery_id, asset_id, url, ... }`
- [x] 🔧 `PATCH /media/assets/{id}` — reorder (`position`) / set `is_primary`
- [x] 🔧 `DELETE /media/assets/{id}` — removes the asset record and its stored file
- [x] 🔧 Wire "attach on save": when an entity's create/update request includes a
      `media_gallery_id`, create the `MediaAttachment` (`attachable_type`/`attachable_id`) —
      implement first for `Item` (already has the relations), pattern documented for `Employee`/
      `User`/`Dish` to adopt the same way
- [x] 🔧 Artisan command `media:cleanup-orphans` — deletes `MediaGallery` rows with no
      `MediaAttachment` older than a configurable grace period, plus their `MediaAsset` rows and
      the underlying stored files. See Technical Decision below for how/when this runs.
- [x] 🔧 Wire the cleanup command into the container's startup/entrypoint script (runs once per
      new revision boot, not on a recurring schedule — see Technical Decision)
- [x] 📚 New convention doc: `doc/conventions/backend/media-uploads.md` — documents the
      upload-first/attach-on-save pattern above so future entities (Employee avatar, Dish photos,
      etc.) follow the same shape instead of reinventing it
- [x] 🧪 PHPUnit coverage: upload creates gallery+asset, second upload reuses gallery, attach-on-save
      creates the `MediaAttachment`, cleanup command deletes only genuinely orphaned+expired
      galleries (not recently-created ones still mid-form)

## 📐 Technical Decision — TD-02 (to be committed as `doc/decisions/td-02-media-cleanup-strategy.md` when this issue closes, per TD-01's own precedent of decisions landing with the PR that implements them)

### Decision

`media:cleanup-orphans` runs at container startup (entrypoint script), once per new revision —
not on a recurring schedule for now. It's idempotent, safe to run redundantly if Cloud Run starts
multiple instances of the same revision. When a genuinely periodic cadence is needed later, adopt
**Google Cloud Scheduler → Cloud Run Jobs** — not a Laravel queue worker, not SQS+EC2.

### Justification

**Why not a Laravel scheduled job / queue worker now?** The project runs on Cloud Run for cost
reasons — Cloud Run scales to zero and doesn't guarantee a long-running background process. A
queue worker or `schedule:work` daemon needs a container that's always running
(`min-instances=1`), which means paying for at least one always-on instance 24/7 — directly
against the reason Cloud Run was chosen.

**Why not SQS + an external worker now?** Solves the always-on-worker cost problem, but adds a
whole new piece of infrastructure (a queue, its own credentials, somewhere to run the consumer) to
solve "clean up a handful of orphaned uploads" — more machinery than this project's current
traffic justifies.

**Why startup-triggered instead of nothing until Cloud Scheduler is set up?** Orphaned uploads are
real storage clutter from day one (every abandoned form leaves files behind), and deploys already
happen frequently during active development — piggybacking on startup is free (no new infra) and
keeps the mess bounded between deploys, even without a strict schedule.

**Known, accepted limitation:** if the container runs a long time without a new revision, cleanup
doesn't run in between. Acceptable at this project's current stage (low traffic, frequent
deploys).

### When to revisit

When deploy frequency drops (production stabilizes) and orphaned-upload accumulation between
deploys becomes a real problem, move to Cloud Scheduler → Cloud Run Jobs. If the project ever
moves off Cloud Run to a host with a persistent process (EC2, VM, GKE), a standard Laravel
`schedule:work` cron becomes simpler than Cloud Scheduler and is the better fit then.

## 🔗 References

- Existing model: `code/api/app/Models/MediaAsset.php`, `MediaAttachment.php`, `MediaGallery.php`
- Existing migrations: `2025_11_06_000012_create_media_galleries_table.php`,
  `..._000013_create_media_assets_table.php`, `..._000014_create_media_attachments_table.php`
- Storage config: `code/api/config/filesystems.php`
- Item already wired: `code/api/app/Models/Item.php` (`mediaAttachments()`, `primaryMediaGallery()`)

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `4h` · **Pessimistic:** `8h` · **Tracked:** `9h29m`

### 📅 Sessions
```json
[
  { "date": "2026-08-01", "start": "11:35", "end": "16:55" },
  { "date": "2026-08-04", "start": "17:44", "end": "19:28" },
  { "date": "2026-08-05", "start": "00:25", "end": "02:25" },
  { "date": "2026-08-05", "start": "09:51", "end": "10:16" }
]
```

## 📊 Retrospective

**Tracked:** `9h29m` across 4 sessions — `+5h29m` (+137%) over the `4h` optimistic estimate,
`+1h29m` (+19%) over the `8h` pessimistic estimate.

**Session 1 (2026-08-01, 5h20m):** the core build (3 new services/6 endpoints, Item attach-on-save
wiring, the `media:cleanup-orphans` command + container-startup wiring, permission seeders across
three environments, and the EN/ES architecture + convention + TD-02 docs) landed close to the
optimistic estimate on its own. The overage in this session came from three review/iteration
cycles layered on top of that base build, all genuinely productive rather than churn:

- **CI (SonarCloud):** the first upload-size validation used a config-driven `max:` value; `php:S5693`
  flags any file-upload cap it can't statically resolve, and its own compliant example uses
  exactly `8000` KB, not `8192` — two short fix-and-recheck cycles to land on the literal value the
  rule actually expects.
- **Copilot review:** 7 threads, all genuine (mass-assignment risk, an incomplete response schema,
  two real concurrency races, an unbounded `->get()` in a startup command, and two broken relative
  links) — no false positives to argue down.
- **Devin/DeepWiki review:** 4 cycles surfacing 6 additional genuine defects beyond what Copilot
  caught — concurrent-request races in `is_primary` handling, DB/file delete-ordering that could
  strand a row pointing at an already-deleted file, position collisions after a deletion left a
  gap, a silent-failure path when `Storage::store()` returns `false` instead of throwing, and a
  stale-attachment bug when an entity's gallery changes. One of my own fixes (`catch (Throwable
  $e)` without `use Throwable;`) silently never matched due to a PHP namespace-resolution gotcha —
  caught immediately by the new test written for that exact fix, not by a later review pass, which
  is the coverage discipline paying for itself.

**Sessions 2 and 3 (2026-08-04–05, 3h44m combined)** — timestamps reconstructed from this PR's
commit-authored times, since this follow-up work happened through direct conversational review
rather than a formally bracketed `/start-issue` session — covered a second, materially deeper
round of review than the original estimate accounted for:

- 🔨 Split the monolithic `MediaLibraryService` into three single-responsibility invokable
  services (`UploadMediaService`/`UpdateMediaAssetService`/`DeleteMediaAssetService`), matching
  the repo's Actions/Services convention.
- 🐛 Fixed three more concurrency/correctness bugs beyond Session 1's: an `is_primary` truthiness
  bug (integer `1` bypassing a strict `=== true` check), a single-asset-gallery primary-demotion
  invariant violation, and a genuine stale-read race where `is_primary` was captured *before* the
  gallery row lock instead of after — defeating the lock's entire purpose. Each was reproduced
  deterministically with a regression test before being fixed.
- 🔒 **Designed and built a whole new authorization layer** not scoped in the original issue:
  the `AuthorizesMediaOwnership` contract + `MediaGallery::isManageableBy()`, a client-generated
  `owner_token` for galleries still mid-form, and a dedicated `items.manage-media` permission
  decoupled from `items.update` (which also guards catalog/pricing edits) — driven by direct user
  requirements clarified through follow-up questions rather than an automated review pass.
- 🔒 Fixed four security defects surfaced by a mix of Devin/DeepWiki review and direct user-guided
  security review: a `TypeError`→500 crash from unvalidated array input reaching `authorize()`, a
  gallery-hijack path where attach-on-save never checked ownership before linking a gallery to a
  new entity, `owner_token` leaking into `DELETE` query strings (access-log/proxy/APM exposure),
  and a fail-open bug where a soft-deleted attachable resolved to `null` and was misread as "no
  authorization rule adopted."
- 🔧 Corrected an over-broad permission grant (`manager` initially got full `items.update`, which
  also unlocks catalog/pricing edits, purely to satisfy the media-ownership check) down to the
  minimum actually needed.
- ✅ Every fix above shipped with a regression test confirmed to fail against the pre-fix code and
  pass against the fix — none were taken on faith.

**Session 4 (2026-08-05, 25m)** — a single, focused follow-up fix requested after the PR had
already been through one full `/finish-pr` pass: `CleanupOrphanedMedia` had no error handling, so
`DeleteMediaAssetService::__invoke()` throwing `ModelNotFoundException` (via `Model::refresh()`,
which uses `firstOrFail()` internally — confirmed by reading the framework source rather than
assumed) when an asset was already deleted by a concurrent actor aborted the entire orphan-cleanup
sweep, contradicting TD-02's explicit "safe to run redundantly" claim. Fixed at the root (the
service now tolerates an already-gone asset instead of throwing, protecting both the cleanup
command and the `DELETE` endpoint's own equivalent race) plus a per-gallery `try`/`catch` in the
command as defense in depth. Both fixes shipped with a regression test confirmed to fail against
the pre-fix code and pass against the fix.

None of this was scope creep in the harmful sense: every fix addressed a real, verified defect
rather than speculative hardening. The overrun past the pessimistic estimate reflects that this
PR's actual surface — a new authorization system for polymorphic media ownership, not just wiring
up upload endpoints — was materially larger than scoped, which is exactly the kind of
unknown-unknown the original estimate's own confidence caveat (*"moderate for the larger Platillos
Issues... new-domain work with more unknowns than a migration or bug fix"*) called out in advance.



