<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Receipt extends Model
{
    use HasFactory, HasPublicId, SoftDeletes;

    public const STATUS_DRAFT = 'DRAFT';

    public const STATUS_POSTED = 'POSTED';

    public const STATUS_REVERSED = 'REVERSED';

    protected $fillable = [
        'supplier_id',
        'destination_location_id',
        'reference',
        'receipt_date',
        'status',
        'notes',
        'posted_at',
        'posted_by_user_id',
        'reversed_at',
        'reversed_by_user_id',
        'reversal_reason',
        'created_by_user_id',
        'meta',
    ];

    protected $casts = [
        'receipt_date' => 'date',
        'posted_at' => 'datetime',
        'reversed_at' => 'datetime',
        'meta' => 'array',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class)->withTrashed();
    }

    public function destinationLocation(): BelongsTo
    {
        return $this->belongsTo(InventoryLocation::class, 'destination_location_id')->withTrashed();
    }

    public function lines(): HasMany
    {
        return $this->hasMany(ReceiptLine::class);
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function postedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by_user_id');
    }

    public function reversedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reversed_by_user_id');
    }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isPosted(): bool
    {
        return $this->status === self::STATUS_POSTED;
    }

    public function isReversed(): bool
    {
        return $this->status === self::STATUS_REVERSED;
    }

    public function scopeStatus($query, string $status)
    {
        return $query->where('status', $status);
    }
}
