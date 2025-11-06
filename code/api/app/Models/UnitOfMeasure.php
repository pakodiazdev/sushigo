<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UnitOfMeasure extends Model
{
    use HasFactory;

    protected $table = 'units_of_measure';

    protected $fillable = [
        'code',
        'name',
        'symbol',
        'precision',
        'is_decimal',
        'is_active',
        'meta',
    ];

    protected $casts = [
        'precision' => 'integer',
        'is_decimal' => 'boolean',
        'is_active' => 'boolean',
        'meta' => 'array',
    ];

    /**
     * Get conversions from this unit
     */
    public function conversionsFrom(): HasMany
    {
        return $this->hasMany(UomConversion::class, 'from_uom_id');
    }

    /**
     * Get conversions to this unit
     */
    public function conversionsTo(): HasMany
    {
        return $this->hasMany(UomConversion::class, 'to_uom_id');
    }

    /**
     * Get all item variants using this UOM
     */
    public function itemVariants(): HasMany
    {
        return $this->hasMany(ItemVariant::class, 'uom_id');
    }

    /**
     * Scope to filter active UOMs
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter decimal UOMs
     */
    public function scopeDecimal($query)
    {
        return $query->where('is_decimal', true);
    }

    /**
     * Get the conversion factor to another UOM
     */
    public function getConversionFactor(UnitOfMeasure $toUom): ?float
    {
        $conversion = $this->conversionsFrom()
            ->where('to_uom_id', $toUom->id)
            ->where('is_active', true)
            ->first();

        return $conversion?->factor;
    }
}
