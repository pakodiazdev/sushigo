<?php

namespace App\Contracts;

use App\Models\User;

/**
 * Implemented by any model that can own a MediaGallery attachment, so
 * MediaGallery::isManageableBy() can defer to entity-specific rules instead
 * of hardcoding them — see doc/conventions/backend/media-uploads.md.
 * Item checks a permission; a future User avatar would check pure
 * ownership ($user->id === $this->id).
 */
interface AuthorizesMediaOwnership
{
    /**
     * Whether $user may add, reorder, or delete media attached to this
     * entity's gallery.
     */
    public function userCanManageMedia(User $user): bool;
}
