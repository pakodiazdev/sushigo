# TD-02 · Orphaned media cleanup runs at container startup, not on a schedule

## Decision

`media:cleanup-orphans` runs at container startup (`docker/app/config/preview/entrypoint.sh`), once
per new revision — not on a recurring schedule for now. It's idempotent, safe to run redundantly if
Cloud Run starts multiple instances of the same revision. When a genuinely periodic cadence is
needed later, adopt **Google Cloud Scheduler → Cloud Run Jobs** — not a Laravel queue worker, not
SQS+EC2.

## Justification

**Why not a Laravel scheduled job / queue worker now?** The project runs on Cloud Run for cost
reasons — Cloud Run scales to zero and doesn't guarantee a long-running background process. A queue
worker or `schedule:work` daemon needs a container that's always running (`min-instances=1`), which
means paying for at least one always-on instance 24/7 — directly against the reason Cloud Run was
chosen.

**Why not SQS + an external worker now?** Solves the always-on-worker cost problem, but adds a whole
new piece of infrastructure (a queue, its own credentials, somewhere to run the consumer) to solve
"clean up a handful of orphaned uploads" — more machinery than this project's current traffic
justifies.

**Why startup-triggered instead of nothing until Cloud Scheduler is set up?** Orphaned uploads are
real storage clutter from day one (every abandoned form leaves files behind), and deploys already
happen frequently during active development — piggybacking on startup is free (no new infra) and
keeps the mess bounded between deploys, even without a strict schedule.

**Known, accepted limitation:** if the container runs a long time without a new revision, cleanup
doesn't run in between. Acceptable at this project's current stage (low traffic, frequent deploys).

**Why a hard delete instead of respecting SoftDeletes?** `MediaGallery`/`MediaAsset` both use
`SoftDeletes` for the normal CRUD paths (`DELETE /media/assets/{id}` still soft-deletable in
principle), but the cleanup command deletes the underlying stored file first — a soft-deleted row
pointing at a file that no longer exists on disk serves no purpose, so `forceDelete()` is used here
instead of `delete()`.

## When to revisit

When deploy frequency drops (production stabilizes) and orphaned-upload accumulation between
deploys becomes a real problem, move to Cloud Scheduler → Cloud Run Jobs. If the project ever moves
off Cloud Run to a host with a persistent process (EC2, VM, GKE), a standard Laravel `schedule:work`
cron becomes simpler than Cloud Scheduler and is the better fit then.
