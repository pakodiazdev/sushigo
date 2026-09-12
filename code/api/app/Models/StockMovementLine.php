<?php

namespace App\Models;

use App\Exceptions\ImmutableStockMovementException;
use App\Exceptions\InvalidStockMovementContractException;
use App\Support\Traits\HasPublicId;
use App\Support\Traits\SerializesPublicIdAsId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovementLine extends Model
{
    use HasPublicId, SerializesPublicIdAsId;

    protected $fillable = [
        'stock_movement_id',
        'uom_id',
        'qty',
        'conversion_factor',
        'unit_cost',
        'line_total',
        'sale_price',
        'sale_total',
        'profit_margin',
        'profit_total',
        'meta',
    ];

    protected $casts = [
        'qty' => 'decimal:4',
        'conversion_factor' => 'decimal:6',
        'unit_cost' => 'decimal:4',
        'line_total' => 'decimal:4',
        'sale_price' => 'decimal:4',
        'sale_total' => 'decimal:4',
        'profit_margin' => 'decimal:4',
        'profit_total' => 'decimal:4',
        'meta' => 'array',
    ];

    protected static function booted(): void
    {
        // On `saving`, not `creating`/`updating` — the HasPublicId trait's
        // `creating` listener returns a value that halts the halting
        // `creating` event before a second listener would run.
        static::saving(function (self $line) {
            if ($line->exists) {
                $line->assertParentIsMutable();
            } else {
                $line->assertMovementHasNoOtherLine();
            }
        });

        static::deleting(function (self $line) {
            $line->assertParentIsMutable();
        });
    }

    /**
     * A line whose parent movement is already POSTED (or REVERSED) is
     * append-only, exactly like the header — and it can never be moved to a
     * different movement, so a line cannot be reparented off a posted header
     * onto a draft one to slip past this check.
     *
     * @throws ImmutableStockMovementException
     */
    public function assertParentIsMutable(): void
    {
        if ($this->exists && $this->isDirty('stock_movement_id')) {
            throw new ImmutableStockMovementException(
                "StockMovementLine #{$this->id} cannot be reparented to another movement."
            );
        }

        // Check the line's *original* parent (falling back to the current one
        // when the FK was never loaded/changed): reading only the current
        // parent would miss a line being detached from a posted movement.
        $parentId = $this->getOriginal('stock_movement_id') ?? $this->stock_movement_id;
        $movement = StockMovement::find($parentId);

        if ($movement && $movement->status !== StockMovement::STATUS_DRAFT) {
            throw new ImmutableStockMovementException(
                "StockMovementLine #{$this->id} belongs to a {$movement->status} movement; posted stock history is append-only."
            );
        }
    }

    /**
     * The single-line contract: a movement carries at most one line. Enforced
     * here at the application layer so no code path trips the DB-level
     * UNIQUE(stock_movement_id) constraint — a raw constraint violation would
     * abort the surrounding transaction (poisoning the rest of a test run),
     * whereas this throws cleanly before the INSERT is attempted.
     *
     * @throws InvalidStockMovementContractException
     */
    public function assertMovementHasNoOtherLine(): void
    {
        if ($this->stock_movement_id === null) {
            return;
        }

        $exists = static::query()
            ->where('stock_movement_id', $this->stock_movement_id)
            ->exists();

        if ($exists) {
            throw new InvalidStockMovementContractException(
                "StockMovement #{$this->stock_movement_id} already has a line; the movement contract is single-line."
            );
        }
    }

    /**
     * Get the stock movement
     */
    public function stockMovement(): BelongsTo
    {
        return $this->belongsTo(StockMovement::class);
    }

    /**
     * Get the unit of measure used in transaction
     */
    public function unitOfMeasure(): BelongsTo
    {
        return $this->belongsTo(UnitOfMeasure::class, 'uom_id');
    }

    /**
     * Calculate line total from qty and unit cost
     */
    public function calculateLineTotal(): float
    {
        return $this->qty * ($this->unit_cost ?? 0);
    }
}
