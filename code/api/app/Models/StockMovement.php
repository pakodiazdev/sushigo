<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class StockMovement extends Model
{
    protected $fillable = [
        'from_location_id',
        'to_location_id',
        'item_variant_id',
        'user_id',
        'qty',
        'reason',
        'status',
        'reference',
        'related_id',
        'related_type',
        'notes',
        'meta',
        'posted_at',
    ];

    protected $casts = [
        'qty' => 'decimal:4',
        'meta' => 'array',
        'posted_at' => 'datetime',
    ];

    // Reason constants
    public const REASON_TRANSFER = 'TRANSFER';
    public const REASON_RETURN = 'RETURN';
    public const REASON_SALE = 'SALE';
    public const REASON_ADJUSTMENT = 'ADJUSTMENT';
    public const REASON_CONSUMPTION = 'CONSUMPTION';
    public const REASON_OPENING_BALANCE = 'OPENING_BALANCE';
    public const REASON_COUNT_VARIANCE = 'COUNT_VARIANCE';

    // Status constants
    public const STATUS_DRAFT = 'DRAFT';
    public const STATUS_POSTED = 'POSTED';
    public const STATUS_REVERSED = 'REVERSED';

    /**
     * Get the source location
     */
    public function fromLocation(): BelongsTo
    {
        return $this->belongsTo(InventoryLocation::class, 'from_location_id');
    }

    /**
     * Get the destination location
     */
    public function toLocation(): BelongsTo
    {
        return $this->belongsTo(InventoryLocation::class, 'to_location_id');
    }

    /**
     * Get the item variant
     */
    public function itemVariant(): BelongsTo
    {
        return $this->belongsTo(ItemVariant::class);
    }

    /**
     * Get the user who created the movement
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get movement lines (for multi-line movements)
     */
    public function lines(): HasMany
    {
        return $this->hasMany(StockMovementLine::class);
    }

    /**
     * Get the related entity (polymorphic)
     */
    public function related(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Scope to filter posted movements
     */
    public function scopePosted($query)
    {
        return $query->where('status', self::STATUS_POSTED);
    }

    /**
     * Scope to filter draft movements
     */
    public function scopeDraft($query)
    {
        return $query->where('status', self::STATUS_DRAFT);
    }

    /**
     * Scope to filter by reason
     */
    public function scopeReason($query, string $reason)
    {
        return $query->where('reason', $reason);
    }

    /**
     * Scope to filter transfers
     */
    public function scopeTransfers($query)
    {
        return $query->where('reason', self::REASON_TRANSFER);
    }

    /**
     * Check if movement is posted
     */
    public function isPosted(): bool
    {
        return $this->status === self::STATUS_POSTED;
    }

    /**
     * Check if movement is draft
     */
    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    /**
     * Check if movement is a transfer
     */
    public function isTransfer(): bool
    {
        return $this->reason === self::REASON_TRANSFER;
    }

    /**
     * Check if movement is an entry (to_location only)
     */
    public function isEntry(): bool
    {
        return $this->to_location_id !== null && $this->from_location_id === null;
    }

    /**
     * Check if movement is an exit (from_location only)
     */
    public function isExit(): bool
    {
        return $this->from_location_id !== null && $this->to_location_id === null;
    }
}
