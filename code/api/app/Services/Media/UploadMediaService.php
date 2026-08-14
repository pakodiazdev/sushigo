<?php

namespace App\Services\Media;

use App\Exceptions\MediaStorageFailureException;
use App\Models\MediaAsset;
use App\Models\MediaGallery;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Store an uploaded file, creating a new gallery when none is given or
 * adding to the existing one otherwise. The first asset in a gallery is
 * always the primary one until a later PATCH says otherwise.
 *
 * Storage I/O happens before the transaction (not DB work); the gallery
 * row is locked for the rest so concurrent uploads to the same gallery
 * can't both read "0 assets" and both write position=0/is_primary=true.
 *
 * If the transaction fails (gallery vanished, DB error), the file that
 * was already written is deleted rather than left behind as an orphan
 * with no MediaAsset row — media:cleanup-orphans only sweeps orphaned
 * *galleries*, so a file with no row at all would never be caught.
 *
 * $ownerToken is stored on a freshly created gallery only — it's the
 * caller's proof of ownership while the gallery is still unattached to any
 * entity, checked by MediaGallery::isManageableBy() on later requests
 * against the same gallery.
 */
class UploadMediaService
{
    public function __invoke(UploadedFile $file, ?int $mediaGalleryId, ?string $ownerToken = null, ?string $context = null): MediaAsset
    {
        // config/filesystems.php sets 'throw' => false on both disks, so a
        // storage failure (disk full, permissions) returns false instead of
        // throwing — without this check that false would silently become
        // the MediaAsset's path, creating a row for a file that was never
        // actually written.
        $path = $file->store('media', config('filesystems.default'));

        if ($path === false) {
            throw new MediaStorageFailureException('Failed to store uploaded media file.');
        }

        try {
            return DB::transaction(function () use ($file, $mediaGalleryId, $ownerToken, $context, $path) {
                $gallery = $mediaGalleryId
                    ? MediaGallery::lockForUpdate()->findOrFail($mediaGalleryId)
                    : MediaGallery::create(['name' => 'Untitled gallery', 'owner_token' => $ownerToken, 'context' => $context]);

                // max(position)+1, not count(): after a deletion leaves a gap
                // (e.g. positions 0,2 remain), count() would recompute 2 and
                // collide with the existing asset already at position 2.
                $maxPosition = $gallery->mediaAssets()->max('position');

                return MediaAsset::create([
                    'media_gallery_id' => $gallery->id,
                    'path' => $path,
                    'mime_type' => $file->getMimeType(),
                    // Client-controlled (multipart Content-Disposition) and
                    // unbounded — truncated to fit the filename column
                    // (varchar(255)) instead of letting an oversized value
                    // reach the DB as an uncaught insert error.
                    'filename' => mb_substr($file->getClientOriginalName(), 0, 255),
                    'size' => $file->getSize(),
                    'position' => is_null($maxPosition) ? 0 : $maxPosition + 1,
                    'is_primary' => is_null($maxPosition),
                ]);
            });
        } catch (Throwable $e) {
            Storage::disk(config('filesystems.default'))->delete($path);
            throw $e;
        }
    }
}
