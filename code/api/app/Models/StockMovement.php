<?php

namespace App\Models;

use App\Models\Concerns\EnforcesStockMovementContract;
use App\Support\Traits\HasPublicId;
use App\Support\Traits\SerializesPublicIdAsId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class StockMovement extends Model
{
    use EnforcesStockMovementContract, HasPublicId, SerializesPublicIdAsId;

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
        'reverses_stock_movement_id',
        'reversed_by_user_id',
        'reversed_at',
        'reversal_reason',
        'notes',
        'meta',
        'posted_at',
    ];

    protected $casts = [
        'qty' => 'decimal:4',
        'meta' => 'array',
        'posted_at' => 'datetime',
        'reversed_at' => 'datetime',
    ];

    // Reason constants
    public const REASON_TRANSFER = 'TRANSFER';

    public const REASON_RETURN = 'RETURN';

    public const REASON_SALE = 'SALE';

    public const REASON_ADJUSTMENT = 'ADJUSTMENT';

    public const REASON_CONSUMPTION = 'CONSUMPTION';

    public const REASON_OPENING_BALANCE = 'OPENING_BALANCE';

    public const REASON_COUNT_VARIANCE = 'COUNT_VARIANCE';

    public const REASON_PURCHASE_RECEIPT = 'PURCHASE_RECEIPT';

    public const REASON_PURCHASE_RECEIPT_REVERSAL = 'PURCHASE_RECEIPT_REVERSAL';

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
     * The posted movement this row compensates (set only on a reversal movement).
     */
    public function reverses(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reverses_stock_movement_id');
    }

    /**
     * The compensating movement that reversed this one, if any.
     */
    public function reversal(): HasOne
    {
        return $this->hasOne(self::class, 'reverses_stock_movement_id');
    }

    /**
     * The user who reversed this movement.
     */
    public function reversedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reversed_by_user_id');
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
     * Check if movement has been reversed by a compensating movement.
     */
    public function isReversed(): bool
    {
        return $this->status === self::STATUS_REVERSED;
    }

    /**
     * Check if movement is itself a compensating reversal of another movement.
     */
    public function isReversal(): bool
    {
        return $this->reverses_stock_movement_id !== null;
    }
}
