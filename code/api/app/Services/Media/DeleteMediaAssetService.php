<?php

namespace App\Services\Media;

use App\Models\MediaAsset;
use App\Models\MediaGallery;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Remove the asset record and its stored file. This is a hard delete —
 * a soft-deleted row pointing at a now-missing file serves no purpose.
 * If the removed asset was the gallery's primary, the next asset by
 * position is promoted — otherwise a gallery with remaining assets
 * could be left with none marked primary. Takes the same gallery-row
 * lock as UploadMediaService/UpdateMediaAssetService — without it, a
 * concurrent delete and update targeting the same gallery aren't mutually
 * exclusive and could both promote a different asset to primary.
 *
 * The DB work commits first and the file is deleted only afterwards —
 * the other way around, a mid-transaction failure would roll the row
 * delete back while the file deletion (not part of the DB transaction)
 * stayed applied, leaving a surviving MediaAsset row pointing at a file
 * that's already gone.
 */
class DeleteMediaAssetService
{
    public function __invoke(MediaAsset $asset): void
    {
        $path = $asset->path;
        $galleryId = $asset->media_gallery_id;

        $alreadyGone = DB::transaction(function () use ($asset, $galleryId) {
            MediaGallery::lockForUpdate()->find($galleryId);

            // Re-read after acquiring the lock, not before: $asset was
            // hydrated by route-model binding (or, from CleanupOrphanedMedia,
            // an earlier query) ahead of this transaction, so it can already
            // be gone by the time this runs — a concurrent DELETE request for
            // the same asset, or a second media:cleanup-orphans instance
            // (TD-02 explicitly relies on redundant concurrent runs being
            // safe) may have deleted it first. fresh() returns null instead
            // of throwing in that case, so this is treated as already done
            // rather than crashing the caller — which, for the cleanup
            // command, would otherwise abort the entire sweep over one
            // already-handled asset and leave the rest of the backlog
            // untouched.
            $fresh = $asset->fresh();

            if (! $fresh) {
                return true;
            }

            $wasPrimary = $fresh->is_primary;

            $asset->forceDelete();

            if ($wasPrimary) {
                MediaAsset::where('media_gallery_id', $galleryId)
                    ->orderBy('position')
                    ->first()
                    ?->update(['is_primary' => true]);
            }

            return false;
        });

        if ($alreadyGone) {
            return;
        }

        // 'throw' => false on both disks means a failed delete returns false
        // instead of throwing — logged so a stray file doesn't go unnoticed,
        // but not fatal: the DB row is already gone, which is the part that
        // matters for correctness.
        if (! Storage::disk(config('filesystems.default'))->delete($path)) {
            Log::warning('media:deleteAsset failed to delete stored file', ['path' => $path]);
        }
    }
}
