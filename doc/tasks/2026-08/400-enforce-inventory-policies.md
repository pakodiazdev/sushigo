# 🐛 Inventory policies authorize unconditionally instead of enforcing permissions

## Bug description

Three auto-discovered Laravel policies authorize every ability unconditionally:

- `App\Policies\ItemPolicy`
- `App\Policies\ItemVariantPolicy`
- `App\Policies\InventoryLocationPolicy`

Their `viewAny()`, `view()`, `create()`, `update()`, `delete()`, `restore()`, and
`forceDelete()` methods return `true` without checking the authenticated user's permissions. The
existing unit tests reinforce the stub behavior by asserting that every mutation ability is
allowed.

Current HTTP endpoints are still protected by route middleware and Form Request authorization, so
this is **not evidence of a currently exploitable endpoint**. It is a latent authorization defect:
any new controller, service, media attachment, Blade directive, or API path that correctly calls
`$user->can(...)` receives a false authorization result without an error.

## Hypothesis

These three policies were generated from Laravel's default policy stub and never filled in with
real authorization logic before the corresponding permissions (`items.*`,
`inventory_locations.*`) existed in the permission seeders. Every ability was left as a hardcoded
`return true` (some on nullable-`$user` methods to satisfy `Gate::methodAllowsGuests()`, others on
parameterless methods), with comments claiming the resources are "public" or open to "any
authenticated user." No caller currently exercises these policies directly — route middleware and
Form Request `authorize()` checks are what actually gate the HTTP endpoints today — so the stub
return values have never been observed to produce a wrong HTTP response. The defect is latent: it
only becomes exploitable the moment new code calls `$user->can(...)` / `$this->authorize(...)`
against `Item`, `ItemVariant`, or `InventoryLocation` and trusts the result.

## Reproduction guide

1. In `code/api`, open a Tinker shell or a scratch test and construct a user with **no**
   permissions assigned (e.g. a fresh `User` with no roles).
2. Call `$user->can('create', \App\Models\Item::class)` (or `view`, `update`, `delete`, `restore`,
   `forceDelete`, and the same for `ItemVariant::class` / `InventoryLocation::class`).
3. **Observed:** every call returns `true`, regardless of the user's permissions.
4. **Expected:** each ability should return `true` only when the user holds the permission listed
   in the "Verified authorization contract" table below (e.g. `create` on `Item` requires
   `items.create`), and `false` for a guest/no-permission user.
5. The existing unit tests under `code/api/tests/Unit/Policies/` for these three policies currently
   assert the buggy `true`-for-everyone behavior, which is why this has gone unnoticed — they
   reinforce the stub instead of catching it.

## Verified authorization contract

The policies must match the permissions already enforced by the API:

| Policy abilities | Required permission |
|---|---|
| `ItemPolicy::viewAny`, `view` | `items.view` |
| `ItemPolicy::create` | `items.create` |
| `ItemPolicy::update` | `items.update` |
| `ItemPolicy::delete`, `restore`, `forceDelete` | `items.delete` |
| `ItemVariantPolicy::viewAny`, `view` | `items.view` |
| `ItemVariantPolicy::create` | `items.create` |
| `ItemVariantPolicy::update` | `items.update` |
| `ItemVariantPolicy::delete`, `restore`, `forceDelete` | `items.delete` |
| `InventoryLocationPolicy::viewAny`, `view` | `inventory_locations.view` |
| `InventoryLocationPolicy::create`, `update`, `delete`, `restore`, `forceDelete` | `inventory_locations.manage` |

The three resources are protected endpoints, so mutation and view abilities must require a
non-null authenticated `User`. Method signatures should follow Laravel's expected policy contract
and accept the model argument where applicable.

## Important media boundary

Do **not** replace `Item::userCanManageMedia()` with `ItemPolicy::update()`. Since #377, media
management intentionally uses the narrower `items.manage-media` permission. Reusing
`items.update` would couple photo management to catalog/pricing edit rights and regress that
least-privilege boundary.

## Objective

- [x] Replace unconditional authorization in all three policies with the verified permission map.
- [x] Remove outdated comments claiming these resources are public or that any authenticated user
      may mutate them.
- [x] Update the three policy unit-test suites to cover an unauthenticated caller, a user without
      permission, and a user with the exact required permission for every ability.
- [x] Confirm users with a neighboring permission are denied (for example, `items.view` cannot
      create/update/delete, and `items.update` cannot manage media).
- [x] Keep `Item::userCanManageMedia()` and its existing media-ownership tests on
      `items.manage-media`.
- [x] Run the relevant policy and inventory permission tests, then the normal API quality gates.

## Acceptance criteria

- [x] No unconditional `return true` remains in the three policies.
- [x] Policy results and route/Form Request authorization use the same permission vocabulary.
- [x] Guests and users without the required permission are denied.
- [x] Users with the exact required permission are allowed.
- [x] Existing inventory endpoints and item-media authorization continue to pass their regression
      tests.
- [x] No unrelated policy or permission redesign is introduced.

## References

- `code/api/app/Policies/ItemPolicy.php`
- `code/api/app/Policies/ItemVariantPolicy.php`
- `code/api/app/Policies/InventoryLocationPolicy.php`
- `code/api/routes/api/items.php`
- `code/api/routes/api/inventory.php`
- `code/api/app/Models/Item.php::userCanManageMedia()`
- Discovered while implementing the generic media system in #377

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h`
- **Pessimistic:** `4h`
- **Tracked:** `3h10m`

### 📅 Sessions
```json
[
  { "date": "2026-08-12", "start": "20:13", "end": "23:23" }
]
```

## 📊 Retrospective
- **Actual total:** 3h 10m (190m)
- **vs optimistic:** +1h 10m
- **vs pessimistic:** −50m

**Justification:**
Landed within the pessimistic estimate but above optimistic, mostly due to review-response
cycles rather than the core fix itself (which was straightforward once the permission map was
verified against route middleware). A transient SonarCloud 502 required one CI retry. The
SonarCloud quality gate then flagged the intentionally-unused model parameters as `S1172`
unused-parameter code smells, requiring a NOSONAR pass. The Devin/DeepWiki automated review
surfaced two rounds of legitimate findings after the initial squash: a stale comment in
`Item.php` still describing `ItemPolicy::update()` as a stub, and a real (if latent) footgun
where a class-string `Gate::allows('update', Item::class)` call would throw `ArgumentCountError`
against a required model parameter instead of denying — fixed by making the model parameters
nullable with a null default. Each of these required its own commit, CI re-run, and Devin
re-scan round trip, which accounts for the time above the optimistic estimate.

