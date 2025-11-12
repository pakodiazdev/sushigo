<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class InventoryLocation extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'operating_unit_id',
        'code',
        'name',
        'type',
        'is_primary',
        'is_active',
        'priority',
        'notes',
        'meta',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'is_active' => 'boolean',
        'priority' => 'integer',
        'meta' => 'array',
    ];

    // Type constants
    public const TYPE_MAIN = 'MAIN';
    public const TYPE_TEMP = 'TEMP';
    public const TYPE_KITCHEN = 'KITCHEN';
    public const TYPE_BAR = 'BAR';
    public const TYPE_RETURN = 'RETURN';
    public const TYPE_WASTE = 'WASTE';
    public const TYPE_DISPLAY = 'DISPLAY';

    /**
     * Get the operating unit that owns this location
     */
    public function operatingUnit(): BelongsTo
    {
        return $this->belongsTo(OperatingUnit::class);
    }

    /**
     * Get all stock records at this location
     */
    public function stock(): HasMany
    {
        return $this->hasMany(Stock::class);
    }

    /**
     * Get stock movements from this location
     */
    public function stockMovementsFrom(): HasMany
    {
        return $this->hasMany(StockMovement::class, 'from_location_id');
    }

    /**
     * Get stock movements to this location
     */
    public function stockMovementsTo(): HasMany
    {
        return $this->hasMany(StockMovement::class, 'to_location_id');
    }

    /**
     * Scope to filter primary locations
     */
    public function scopePrimary($query)
    {
        return $query->where('is_primary', true);
    }

    /**
     * Scope to filter by type
     */
    public function scopeType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope to order by priority
     */
    public function scopeByPriority($query)
    {
        return $query->orderBy('priority', 'desc')->orderBy('name');
    }
}
