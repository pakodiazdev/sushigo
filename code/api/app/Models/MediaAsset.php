<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use App\Support\Traits\SerializesPublicIdAsId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

class MediaAsset extends Model
{
    use HasFactory, HasPublicId, SerializesPublicIdAsId, SoftDeletes;

    protected $fillable = [
        'media_gallery_id',
        'path',
        'mime_type',
        'filename',
        'size',
        'position',
        'is_primary',
        'meta',
    ];

    protected $casts = [
        'size' => 'integer',
        'position' => 'integer',
        'is_primary' => 'boolean',
        'meta' => 'array',
    ];

    /**
     * Get the gallery that owns this media asset
     */
    public function mediaGallery(): BelongsTo
    {
        return $this->belongsTo(MediaGallery::class);
    }

    /**
     * Get the full URL for this media asset.
     *
     * Only a 'local'-driver disk with 'serve' => true and a non-public
     * 'visibility' is routed through Laravel's own protected serve route
     * (config/filesystems.php — see Illuminate\Filesystem\FilesystemServiceProvider)
     * — that's the only case where Storage::url() alone (no signature) 403s,
     * since ServeFile::hasValidSignature() requires a valid *relative*
     * signature unless the disk is public. temporarySignedRoute(...,
     * absolute: false) produces the signature that route actually checks.
     *
     * Every other disk (s3, or a 'local' disk with 'visibility' => 'public')
     * is served directly by Storage::url() without going through that route
     * at all, so no signature applies there. The disk's driver/config is
     * the right discriminator for this, not whether a 'url' key happens to
     * be set — the 's3' disk's 'url' (env('AWS_URL')) is optional; S3 builds
     * a fully-qualified URL from the bucket/endpoint on its own when it's
     * absent, and no 'storage.s3' route exists to fall back on (that route
     * is only ever registered for local-driver disks), so misreading a null
     * 'url' as "needs signing" would throw a RouteNotFoundException instead
     * of returning a link.
     *
     * url() anchors an already-relative signed path at APP_URL, and leaves
     * an already-absolute URL (e.g. the 's3' disk's) untouched — safe for
     * both without branching again, since the API (api.sushigo.local) and
     * webapp (sushigo.local) are different origins.
     */
    public function getUrlAttribute(): string
    {
        $disk = config('filesystems.default');
        $diskConfig = config("filesystems.disks.{$disk}", []);

        $isServedThroughApp = ($diskConfig['driver'] ?? null) === 'local'
            && ($diskConfig['serve'] ?? false)
            && ($diskConfig['visibility'] ?? 'private') !== 'public';

        if ($isServedThroughApp) {
            return url(URL::temporarySignedRoute(
                'storage.'.$disk,
                now()->addHours(24),
                ['path' => $this->path],
                absolute: false
            ));
        }

        return url(Storage::url($this->path));
    }

    /**
     * Get human-readable file size
     */
    public function getHumanSizeAttribute(): string
    {
        $bytes = $this->size;
        $units = ['B', 'KB', 'MB', 'GB'];

        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }

        return round($bytes, 2).' '.$units[$i];
    }

    /**
     * Scope to filter primary media
     */
    public function scopePrimary($query)
    {
        return $query->where('is_primary', true);
    }

    /**
     * Scope to order by position
     */
    public function scopeByPosition($query)
    {
        return $query->orderBy('position');
    }

    /**
     * Check if this is an image
     */
    public function isImage(): bool
    {
        return str_starts_with($this->mime_type, 'image/');
    }

    /**
     * Check if this is a video
     */
    public function isVideo(): bool
    {
        return str_starts_with($this->mime_type, 'video/');
    }
}
