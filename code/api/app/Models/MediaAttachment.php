<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class MediaAttachment extends Model
{
    protected $fillable = [
        'media_gallery_id',
        'attachable_type',
        'attachable_id',
        'is_primary',
        'meta',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'meta' => 'array',
    ];

    /**
     * Get the media gallery
     */
    public function mediaGallery(): BelongsTo
    {
        return $this->belongsTo(MediaGallery::class);
    }

    /**
     * Get the owning attachable model (polymorphic)
     */
    public function attachable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Scope to filter primary attachments
     */
    public function scopePrimary($query)
    {
        return $query->where('is_primary', true);
    }

    /**
     * Scope to filter by attachable type
     */
    public function scopeForType($query, string $type)
    {
        return $query->where('attachable_type', $type);
    }
}
