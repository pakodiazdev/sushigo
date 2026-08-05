<?php

namespace App\Models\Concerns;

use App\Models\MediaAsset;
use App\Models\MediaAttachment;
use App\Models\MediaGallery;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Gives a model a polymorphic media gallery: the primary gallery attached to
 * it, and a one-call shortcut to that gallery's primary asset. Even a
 * "single photo" entity stores its image as a gallery of 1 underneath (see
 * doc/conventions/backend/media-uploads.md), so this trait is the one place
 * that hops attachable -> attachment -> gallery -> asset instead of every
 * consumer re-chaining it.
 *
 * Usage:
 *   use App\Models\Concerns\HasMediaGallery;
 *
 *   class Item extends Model
 *   {
 *       use HasMediaGallery;
 *   }
 */
trait HasMediaGallery
{
    public function mediaAttachments(): MorphMany
    {
        return $this->morphMany(MediaAttachment::class, 'attachable');
    }

    public function primaryMediaGallery(): ?MediaGallery
    {
        return $this->mediaAttachments()
            ->where('is_primary', true)
            ->with('mediaGallery')
            ->first()
            ?->mediaGallery;
    }

    public function primaryMediaAsset(): ?MediaAsset
    {
        return $this->primaryMediaGallery()?->primaryMedia();
    }
}
