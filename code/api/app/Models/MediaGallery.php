<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class MediaGallery extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'cover_media_id',
        'is_shared',
        'meta',
    ];

    protected $casts = [
        'is_shared' => 'boolean',
        'meta' => 'array',
    ];

    /**
     * Get all media assets in this gallery
     */
    public function mediaAssets(): HasMany
    {
        return $this->hasMany(MediaAsset::class)->orderBy('position');
    }

    /**
     * Get the cover media asset
     */
    public function coverMedia(): BelongsTo
    {
        return $this->belongsTo(MediaAsset::class, 'cover_media_id');
    }

    /**
     * Get the primary media asset
     */
    public function primaryMedia()
    {
        return $this->mediaAssets()->where('is_primary', true)->first();
    }

    /**
     * Get all attachments (where this gallery is used)
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(MediaAttachment::class);
    }

    /**
     * Scope to filter shared galleries
     */
    public function scopeShared($query)
    {
        return $query->where('is_shared', true);
    }

    /**
     * Scope to filter private galleries
     */
    public function scopePrivate($query)
    {
        return $query->where('is_shared', false);
    }
}
