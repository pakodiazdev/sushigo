<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use App\Support\Traits\SerializesPublicIdAsId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

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
     * Get the full URL for this media asset. Wrapped in url(): the default
     * 'local' disk (config/filesystems.php) has no 'url' key, so Storage::url()
     * returns a host-relative path via Laravel's serve route — correct for a
     * same-origin app, but broken here since the API (api.sushigo.local) and
     * webapp (sushigo.local) are different origins, so a relative path
     * resolves against the wrong one. url() turns a relative path into an
     * absolute one anchored at APP_URL, and leaves an already-absolute URL
     * (e.g. the 's3' disk's) untouched — safe for both without branching on
     * which disk is active.
     */
    public function getUrlAttribute(): string
    {
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
