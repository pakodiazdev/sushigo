<?php

namespace App\Contracts;

use App\Models\User;

/**
 * Implemented by any model that can own a MediaGallery attachment, so
 * MediaGallery::isManageableBy() can defer to entity-specific rules instead
 * of hardcoding them — see doc/conventions/backend/media-uploads.md.
 * Item checks a dedicated permission; User (employee avatars, #401) checks
 * owner-or-permission ($user->id === $this->id || $user->can('users.update')).
 */
interface AuthorizesMediaOwnership
{
    /**
     * Whether $user may add, reorder, or delete media attached to this
     * entity's gallery.
     */
    public function userCanManageMedia(User $user): bool;
}
