<?php

namespace App\Http\Requests\Concerns;

use App\Models\MediaGallery;

/**
 * Generic gallery-hijack guard every media-adopting entity's create/update
 * request runs (see doc/conventions/backend/media-uploads.md §3.2): without
 * it, attaching an unattached gallery never checked owner_token, so a caller
 * who merely learns another user's in-progress gallery public_id could
 * claim its photo(s) on their own entity, since MediaAttachmentService
 * attaches unconditionally. Requires ReadsRawStringInput on the same class.
 */
trait AuthorizesMediaGalleryOwnership
{
    private function authorizesMediaGalleryOwnership(): bool
    {
        // Raw input, not validated('media_gallery_id'): authorize() runs
        // before the validator, so validated() isn't available yet here.
        $publicId = $this->rawStringInput('media_gallery_id');

        if (! $publicId) {
            return true;
        }

        $gallery = MediaGallery::where('public_id', $publicId)->first();

        if (! $gallery) {
            return true; // let the `exists` rule produce a clean 422
        }

        return $gallery->isManageableBy($this->user(), $this->rawStringInput('owner_token'));
    }
}
