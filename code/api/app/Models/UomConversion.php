<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UomConversion extends Model
{
    protected $fillable = [
        'from_uom_id',
        'to_uom_id',
        'factor',
        'tolerance',
        'is_active',
        'meta',
    ];

    protected $casts = [
        'factor' => 'decimal:6',
        'tolerance' => 'decimal:4',
        'is_active' => 'boolean',
        'meta' => 'array',
    ];

    /**
     * Get the source unit of measure
     */
    public function fromUom(): BelongsTo
    {
        return $this->belongsTo(UnitOfMeasure::class, 'from_uom_id');
    }

    /**
     * Get the target unit of measure
     */
    public function toUom(): BelongsTo
    {
        return $this->belongsTo(UnitOfMeasure::class, 'to_uom_id');
    }

    /**
     * Scope to filter active conversions
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Convert a quantity using this conversion
     */
    public function convert(float $quantity): float
    {
        return $quantity * $this->factor;
    }

    /**
     * Check if a variance is within tolerance
     */
    public function isWithinTolerance(float $expected, float $actual): bool
    {
        if ($expected == 0) {
            return $actual == 0;
        }

        $variance = abs(($actual - $expected) / $expected) * 100;
        return $variance <= $this->tolerance;
    }
}
