<?php

namespace App\Services\Media;

use App\Models\MediaAttachment;
use App\Models\MediaGallery;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * Attaches an already-uploaded MediaGallery to its owning entity. This is
 * the only point where a MediaAttachment is created — see
 * doc/conventions/backend/media-uploads.md for the upload-first/attach-on-save
 * pattern this implements. Item was the first adopter; Dish and User
 * (employee avatars, #401) call it the same way.
 */
class MediaAttachmentService
{
    /**
     * Attaching a new primary gallery removes any other attachment the same
     * entity already had — otherwise re-saving an entity with a different
     * media_gallery_id would leave the old attachment in place (demoting it
     * instead of removing it isn't enough: media:cleanup-orphans only
     * sweeps galleries with zero attachments, so a merely-demoted one would
     * stay attached, and therefore unreachable by cleanup, forever). The
     * old gallery itself is left alone — cleanup picks it up normally once
     * it's genuinely orphaned and past the grace period.
     *
     * Deliberately does *not* remove this gallery's attachment to any
     * *other* attachable: doc/architecture/media/media-architecture.en.md
     * §9 documents "a gallery can end up attached to more than one entity"
     * as accepted debt shared by every adopter (Item, Dish, User) — an
     * earlier version of this method also stripped the other attachable's
     * row here, which silently deleted an unrelated Item/Dish's photo the
     * moment its gallery id was reused elsewhere. If a future issue needs
     * single-owner exclusivity for one specific adopter, that belongs in
     * that adopter's own authorization/request layer, not here.
     */
    public function __invoke(Model $attachable, int $mediaGalleryId, bool $isPrimary = true): MediaAttachment
    {
        $gallery = MediaGallery::findOrFail($mediaGalleryId);

        return DB::transaction(function () use ($gallery, $attachable, $isPrimary) {
            if ($isPrimary) {
                MediaAttachment::where('attachable_type', $attachable->getMorphClass())
                    ->where('attachable_id', $attachable->getKey())
                    ->where('media_gallery_id', '!=', $gallery->id)
                    ->delete();
            }

            return MediaAttachment::updateOrCreate(
                [
                    'media_gallery_id' => $gallery->id,
                    'attachable_type' => $attachable->getMorphClass(),
                    'attachable_id' => $attachable->getKey(),
                ],
                ['is_primary' => $isPrimary]
            );
        });
    }
}
