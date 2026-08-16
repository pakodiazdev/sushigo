<?php

namespace App\Http\Requests\Concerns;

use App\Models\MediaGallery;

/**
 * Shared ownership + avatar-bypass + permission gate for mutating an
 * already-resolved media gallery (delete/update an asset, upload into an
 * existing gallery). The avatar bypass deliberately checks isOwnAvatarOf(),
 * not isManageableBy() alone: the latter also passes for anyone holding
 * users.update via User::userCanManageMedia()'s admin override (meant to let
 * an admin manage an *employee's* avatar through the employee form, #401),
 * which must still require the base permission here — the self-service
 * bypass is only for a caller managing their own avatar. Requires
 * ReadsRawStringInput on the same class.
 */
trait AuthorizesMediaGalleryContextAccess
{
    private function authorizeMediaGalleryContextAccess(MediaGallery $gallery, string $permission): bool
    {
        if (! $gallery->isManageableBy($this->user(), $this->rawStringInput('owner_token'))) {
            return false;
        }

        if ($gallery->context === 'avatar' && $gallery->isOwnAvatarOf($this->user())) {
            return true;
        }

        return $this->user()->can($permission);
    }
}
