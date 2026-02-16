# Unify Employee name with User.name

Summary

We currently store `first_name`/`last_name` on `employees` and a full `name` on the linked `users` table. This duplication causes drift when updates are applied only to one side (e.g., Employee updated but User.name remains stale).

Problem

- Employee and User store the same conceptual data (person's name) in two places.
- Several endpoints update only the employee or only the user, producing inconsistencies.
- Long term this complicates auth responses, display names in the UI and certain integrations.

Proposal

- Migrate to a single source of truth: keep personal data (name, email, phone) on `users` and remove duplicate fields from `employees`.
- Update all codepaths to read employee display info from `user` relation.
- Provide a migration that drops `first_name` and `last_name` from `employees` after ensuring all references are switched.

Notes

- This is a breaking change for code expecting `employees.first_name`/`last_name` — requires coordinated work and a deprecation period.
- Not doing it now to avoid collisions with other active branches. Implement as a planned work item.

Acceptance criteria

- All UI and API responses use `user.name` (or `user.first_name`/`user.last_name` if split) where appropriate.
- Migration available to remove `first_name`/`last_name` columns from `employees` after verification.
- Backwards compatibility shims removed.

Estimated effort: 2-3 dev days (analysis + code changes + migrations + tests)
