<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Internal Stock Transfer document (#573): a draft header with a source
 * Location, a destination Location, and one or more lines, moving managed
 * Variants between Locations through a `DRAFT -> POSTED -> REVERSED` lifecycle.
 *
 * Saving a `DRAFT` changes no Stock. Posting is owned by
 * `App\Services\Inventory\StockTransferService`, which decrements source Stock,
 * increments destination Stock, and appends one immutable `TRANSFER`
 * `StockMovement` per line. Reversal posts compensating movements via the shared
 * `StockMovementReverser`.
 */
class StockTransfer extends Model
{
    use HasFactory, HasPublicId, SoftDeletes;

    public const STATUS_DRAFT = 'DRAFT';

    public const STATUS_POSTED = 'POSTED';

    public const STATUS_REVERSED = 'REVERSED';

    protected $fillable = [
        'source_location_id',
        'destination_location_id',
        'reference',
        'transfer_date',
        'status',
        'notes',
        'created_by_user_id',
        'posted_at',
        'posted_by_user_id',
        'reversed_at',
        'reversed_by_user_id',
        'reversal_reason',
        'meta',
    ];

    protected $casts = [
        'transfer_date' => 'date',
        'posted_at' => 'datetime',
        'reversed_at' => 'datetime',
        'meta' => 'array',
    ];

    public function sourceLocation(): BelongsTo
    {
        return $this->belongsTo(InventoryLocation::class, 'source_location_id')->withTrashed();
    }

    public function destinationLocation(): BelongsTo
    {
        return $this->belongsTo(InventoryLocation::class, 'destination_location_id')->withTrashed();
    }

    public function lines(): HasMany
    {
        return $this->hasMany(StockTransferLine::class);
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

    /**
     * @param  Builder<StockTransfer>  $query
     */
    public function scopeStatus(Builder $query, string $status): Builder
    {
        return $query->where('status', $status);
    }
}
