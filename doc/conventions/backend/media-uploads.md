# Media Upload Standard

> **Scope:** ComandaFlow / SushiGo · Laravel 12 · PHP 8.3

This document defines the upload-first / attach-on-save pattern every entity that needs image
support (Item, Employee, User, Dish, ...) should follow, and the endpoints that implement it.
Introduced in [#377](https://github.com/pakodiazdev/sushigo/issues/377); see
[TD-02](../../decisions/td-02-media-cleanup-strategy.md) for the orphan-cleanup strategy.

## 1) Why this exists

Forms that let a user attach images (a new Dish, a new Employee) commonly need to upload the file
*before* the owning record exists — the user is still mid-form. Building a bespoke upload path per
entity (`items/{id}/photo`, `employees/{id}/avatar`, ...) means solving "where does the file live
before the entity does" N times. This pattern solves it once, on top of the already-migrated
polymorphic `MediaGallery` / `MediaAsset` / `MediaAttachment` models
(`code/api/app/Models/`).

## 2) The pattern

1. **Upload first.** `POST /api/v1/media/upload` accepts a file and an optional
   `media_gallery_id` (the gallery's `public_id` ULID, not its numeric id). With no
   `media_gallery_id`, it creates a new (still-unattached) `MediaGallery` and returns its
   `public_id` — the frontend holds onto this value across the rest of the form. A new gallery
   also requires `context` (one of `config('media.contexts')`'s keys) — see §6 for what it does
   and how a new adopter declares one.
2. **Reuse the gallery for more files.** Uploading again with that same `media_gallery_id` adds
   another `MediaAsset` to the same gallery instead of creating a new one. The first asset in a
   gallery is automatically `is_primary`; later uploads default to not-primary.
3. **Attach on save.** When the entity's create/update request finally happens, it accepts the same
   `media_gallery_id` field. The controller invokes `App\Services\Media\MediaAttachmentService`
   — this is the **only** place a `MediaAttachment` is created, linking the gallery to the entity
   (`attachable_type` / `attachable_id`).
4. **Reorder / set primary.** `PATCH /api/v1/media/assets/{mediaAsset}` (bound by the asset's
   `public_id`) accepts `position` and/or `is_primary`. Setting `is_primary=true` unsets it on
   every sibling asset in the same gallery — there's no DB-level constraint enforcing a single
   primary, `App\Services\Media\UpdateMediaAssetService` does it in a transaction.
5. **Delete.** `DELETE /api/v1/media/assets/{mediaAsset}` removes the stored file and hard-deletes
   the asset row — a soft-deleted row pointing at a file that no longer exists on disk serves no
   purpose.
6. **Cloud-swappable storage.** All reads/writes go through
   `Storage::disk(config('filesystems.default'))` — never a hardcoded disk name. Switching from
   `local` to `s3` in production is a config change only.

## 3) Adopting this for a new entity

Item (`app/Http/Requests/Items/{Create,Update}ItemRequest.php` +
`app/Http/Controllers/Api/V1/Items/{Create,Update}ItemController.php`) is the reference
implementation. To add another entity:

0. Add a `context` key for the entity to `config('media.contexts')` (extensions it should accept —
   see §6) and a `MediaContext` union member on the frontend
   (`code/webapp/src/types/media.ts`) — every `<MediaGalleryUploader context="...">` call site for
   this entity passes it through to every upload.
1. Add `media_gallery_id` (nullable string, `exists:media_galleries,public_id`) and `owner_token`
   (`sometimes`, `string`) to that entity's create/update `FormRequest` rules,
   `use App\Http\Requests\Concerns\{ReadsRawStringInput,ResolvesPublicIdReferences};`, and expose a
   `mediaGalleryId(): ?int` accessor via `$this->resolvePublicId(MediaGallery::class,
   'media_gallery_id')` — the service layer still works with the numeric FK internally, only the
   API boundary is public_id (see #293 for why).
2. **In `authorize()`, before delegating to the entity's own create/update permission check**, call
   `$this->authorizesMediaGalleryOwnership()` via
   `use App\Http\Requests\Concerns\AuthorizesMediaGalleryOwnership;` — the trait resolves the
   gallery from the *raw* input (`$this->rawStringInput('media_gallery_id')` — `validated()` isn't
   available yet, `authorize()` runs before the validator) and calls
   `$gallery->isManageableBy($this->user(), $this->rawStringInput('owner_token'))`:
   ```php
   use App\Http\Requests\Concerns\AuthorizesMediaGalleryOwnership;

   class UpdateEntityRequest extends FormRequest
   {
       use AuthorizesMediaGalleryOwnership, ReadsRawStringInput, ResolvesPublicIdReferences;

       public function authorize(): bool
       {
           if (! $this->user()->can('update', $entity)) {
               return false;
           }

           return $this->authorizesMediaGalleryOwnership();
       }
   }
   ```
   Skipping this step means `MediaAttachmentService` attaches unconditionally — anyone who learns
   another user's in-progress gallery `public_id` (no `owner_token` needed) could claim its photos
   for their own record. `CreateItemRequest`/`UpdateItemRequest` are the reference implementation.
3. Also exclude both `media_gallery_id` and `owner_token` from whatever accessor builds the
   entity's own fillable data (see `CreateItemRequest::itemData()`/`UpdateItemRequest::itemData()`)
   — neither is a real column on the entity.
4. In the controller, after the entity is created/updated, call:
   ```php
   if ($mediaGalleryId = $request->mediaGalleryId()) {
       $mediaAttachmentService($entity, $mediaGalleryId);
   }
   ```
5. Nothing else changes — `MediaAttachmentService` works against any `Model` via
   `getMorphClass()`/`getKey()`, and `updateOrCreate()`s the attachment so re-saving with the same
   gallery is idempotent.
6. Implement `App\Contracts\AuthorizesMediaOwnership` on the entity's model (see section 5) so the
   media endpoints themselves — not just the entity's own create/update route — enforce a real
   ownership rule once a gallery is attached to it.

## 4) Orphan cleanup

`php artisan media:cleanup-orphans` deletes `MediaGallery` rows with no `MediaAttachment` once
they're older than `config('media.orphan_grace_period_days')` (default 7 days) — see
[TD-02](../../decisions/td-02-media-cleanup-strategy.md) for why this runs at container startup
instead of a recurring schedule.

## 5) Ownership authorization

Being able to touch *some* gallery isn't enough to prove a caller is allowed to touch *this* one.
`MediaGallery::isManageableBy(User $user, ?string $ownerToken)` (`app/Models/MediaGallery.php`)
closes that gap, and every media `FormRequest::authorize()` calls it before anything else below.

None of `POST /media/upload`, `PATCH /media/assets/{id}`, or `DELETE /media/assets/{id}` carry a
route-level `permission:media.*` middleware — each permission check moved into its own
`FormRequest::authorize()` instead, gated per **context** rather than per route: once ownership
passes, an `avatar`-context operation (a new gallery, or continuing/mutating one whose *stored*
context is `avatar`) is open to the gallery's own owner, since
[#420](https://github.com/pakodiazdev/sushigo/issues/420) requires the self-service avatar flow —
upload, replace, reorder, set-primary, remove — to work end to end for every role, not just
`admin`/`manager`. Every other context still requires the matching `media.upload`/`media.update`/
`media.delete` permission on top of ownership. Uploading is additionally safe to open up
unconditionally for a brand-new gallery because it only ever creates or extends an *unattached*
gallery — it grants no capability by itself; the real security boundary stays at the
entity-specific attach step below (`UpdateMyAvatarRequest`, `UpdateEmployeeRequest`, ...), which is
unaffected by this bypass.

**"the gallery's own owner", not just `isManageableBy()`.** The three `FormRequest`s gate the
avatar bypass on `MediaGallery::isOwnAvatarOf(User $user)`, a check narrower than
`isManageableBy()` alone: for an *attached* gallery, `isManageableBy()` also passes for anyone
holding `users.update` via `User::userCanManageMedia()`'s admin override below — that override
exists so an admin can manage an *employee's* avatar through the employee form (#401), and must
not additionally let that admin skip `media.update`/`media.delete`/`media.upload` on someone
else's avatar assets through the raw `/media/assets/{id}` or continuing-upload endpoints. The
self-service bypass is only for a caller managing their **own** avatar; every other caller
(including one with `users.update`) still needs the matching `media.*` permission there, same as
before #420. An *unattached* gallery is trivially "own" once `isManageableBy()` has already
confirmed the caller supplied a matching `owner_token` — only its owner could have done that.
`UpdateMyAvatarRequest` additionally requires the referenced gallery's stored `context` to already
be `avatar` (`Rule::exists(...)->where('context', 'avatar')`) — otherwise a caller who can manage an
`item`/`dish` gallery (those contexts allow MP4/MOV) could attach it as their avatar, and
`User::avatarUrl()` would return a video URL that every avatar surface renders through a plain
`<img>`.

- **Attached to an entity** (has one or more `MediaAttachment` rows) — delegates to each attached
  model's `App\Contracts\AuthorizesMediaOwnership::userCanManageMedia(User $user)`. `Item`
  implements it by checking a **dedicated** `items.manage-media` permission — deliberately not
  `items.update`, which also guards catalog/pricing edits (`PUT /items/{id}`,
  `PUT /item-variants/{id}`: name, `sale_price`, `min_stock`, ...). Reusing `items.update` here
  would let anyone granted "manage this item's photos" silently edit catalog data too. Not
  `ItemPolicy::update()` either, which is currently a stub that always returns `true` regardless of
  the user (see #400). `User` (employee avatars,
  [#401](https://github.com/pakodiazdev/sushigo/issues/401)) instead checks owner-or-permission:
  `$user->id === $this->id || $user->can('users.update')` — pure ownership alone wasn't enough
  there, since #401 explicitly requires an administrator to be able to attach/replace *another*
  employee's avatar from the employee form, not just their own.
  An entity that hasn't implemented the contract yet is treated as "no additional rule" — adopting
  it per entity is opt-in and never breaks entities that haven't gotten to it yet.
- **Not attached to anything yet** (mid-form — e.g. uploading photos before a new Item is saved) —
  there's no owning entity to delegate to. The only signal is a client-generated `owner_token`:
  `POST /media/upload` requires it when starting a new gallery (no `media_gallery_id` given), and
  every later request against that same unattached gallery — another upload, a `PATCH`, a
  `DELETE` — must send the same token back as a JSON request body field, or gets a 403. This
  applies to `DELETE` too, even though it's unusual for a DELETE request to carry a body: it is
  **never** sent as a query parameter — `?owner_token=...` would leak this bearer-style credential
  into web-server/proxy/CDN access logs and APM traces, none of which redact query strings by
  default. `FormRequest::authorize()` reads it via `$this->input()`, which Laravel populates from
  the JSON body regardless of HTTP verb, so `DeleteMediaAssetRequest` needs no special handling —
  only the client-side contract differs. A gallery created with no token (shouldn't happen going
  forward, since the field is required) falls back to allowing anyone with the base permission,
  same as before this existed — **except for `avatar` context**, where that fallback is refused
  outright (`context !== 'avatar'` guard in `isManageableBy()`): avatar operations bypass the base
  permission entirely (#420 self-service avatars), so "anyone" would otherwise mean literally
  anyone, with no gate left at all. A token-less unattached avatar gallery is a real case, not a
  hypothetical — it's a legacy row from before the `owner_token` column existed, or a previous
  avatar `MediaAttachmentService` detached on replace, and it stays permanently unmanageable
  through this endpoint once it exists (no one can prove ownership of it anymore).

```php
// Item.php
public function userCanManageMedia(User $user): bool
{
    return $user->can('items.manage-media');
}

// User.php (#401) — owner-or-permission, not a dedicated permission
public function userCanManageMedia(User $user): bool
{
    return $user->id === $this->id || $user->can('users.update');
}
```

## 6) Upload Contexts

Every adopter used to share one global allowed-extensions list — an employee avatar accepted the
same video formats as an Item photo, even though every avatar surface only ever renders through an
`<img>` (a selected video uploaded fine and then just silently failed to render, the initials
fallback masking it entirely; flagged in #401's review). `config('media.contexts')` fixes that by
mapping a context key (`item`, `dish`, `avatar`) to the extensions valid for it.

- `POST /media/upload` **requires** `context` when starting a new gallery (no `media_gallery_id`)
  — an unknown key is a clean 422, not a fallback to some default list.
- The gallery's `context` is set once, at creation, and never changes. Every later upload into that
  same gallery is validated against the gallery's own stored value — not whatever the request
  claims — so a context can't be swapped mid-gallery to slip a disallowed file type past the
  restriction the first upload already fixed.
- `MediaGallery::allowedExtensions()` is the one place this resolves:
  `config("media.contexts.{$this->context}")`. A gallery from before this column existed has no
  stored context and falls back to no extra restriction, rather than breaking an in-flight
  pre-deployment upload session.
- On the frontend, `<MediaGalleryUploader context="...">` threads the same value to every
  `mediaApi.upload()` call and sets the file input's `accept` attribute — client-side convenience
  only, the backend is still the source of truth.

Adding a context for a new adopter is step 0 of §3 above: add its key to `config('media.contexts')`
and add it to the `MediaContext` union (`code/webapp/src/types/media.ts`).
