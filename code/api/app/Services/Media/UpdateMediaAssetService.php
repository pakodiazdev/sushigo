<?php

namespace App\Services\Media;

use App\Models\MediaAsset;
use App\Models\MediaGallery;
use Illuminate\Support\Facades\DB;

/**
 * Apply position/is_primary changes. Setting is_primary=true unsets it
 * on every sibling asset in the same gallery — the table has no DB-level
 * constraint enforcing a single primary, so the app must. The gallery
 * row is locked for the duration so two concurrent PATCH calls against
 * the same gallery can't interleave their unset+set pairs and leave two
 * (or zero) primaries — the same race class UploadMediaService guards
 * against. Explicitly unmarking the current primary (is_primary=false, no
 * other asset set true) promotes the next asset by position instead — the
 * same "never zero primaries while assets exist" invariant
 * DeleteMediaAssetService enforces. When there's no sibling to promote
 * (this is the gallery's only asset), the demotion is refused instead —
 * otherwise the gallery would end up with zero primaries, and nothing
 * would self-heal it: a later upload only defaults to primary when the
 * gallery has no assets at all, not merely no *primary* asset.
 */
class UpdateMediaAssetService
{
    public function __invoke(MediaAsset $asset, array $data): MediaAsset
    {
        DB::transaction(function () use ($asset, $data) {
            MediaGallery::lockForUpdate()->find($asset->media_gallery_id);

            // Re-read after acquiring the lock, not before: $asset was
            // hydrated by route-model binding ahead of this transaction, so
            // its in-memory is_primary can be stale if a concurrent request
            // already changed it while this one waited for the lock —
            // branching on the stale value can promote a sibling on top of
            // one a concurrent request already made primary.
            $asset->refresh();

            if (($data['is_primary'] ?? false) === true) {
                MediaAsset::where('media_gallery_id', $asset->media_gallery_id)
                    ->where('id', '!=', $asset->id)
                    ->update(['is_primary' => false]);
            }

            $wasPrimary = $asset->is_primary;
            $asset->fill(array_intersect_key($data, array_flip(['position', 'is_primary'])));
            $asset->save();

            if ($wasPrimary && ! $asset->is_primary) {
                $sibling = MediaAsset::where('media_gallery_id', $asset->media_gallery_id)
                    ->where('id', '!=', $asset->id)
                    ->orderBy('position')
                    ->first();

                if ($sibling) {
                    $sibling->update(['is_primary' => true]);
                } else {
                    $asset->update(['is_primary' => true]);
                }
            }
        });

        return $asset->refresh();
    }
}
