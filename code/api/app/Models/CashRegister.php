<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CashRegister extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'operating_unit_id',
        'code',
        'name',
        'type',
        'is_active',
        'meta',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'meta' => 'array',
    ];

    // Type constants
    public const TYPE_ON_PREMISE = 'ON_PREMISE';

    public const TYPE_DELIVERY = 'DELIVERY';

    public const TYPE_EVENT = 'EVENT';

    /**
     * Get the branch that owns the register
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get the operating unit (for events)
     */
    public function operatingUnit(): BelongsTo
    {
        return $this->belongsTo(OperatingUnit::class);
    }

    /**
     * Get all sessions for this register
     */
    public function sessions(): HasMany
    {
        return $this->hasMany(CashSession::class);
    }

    /**
     * Scope to filter active registers
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter by branch
     */
    public function scopeByBranch($query, int $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    /**
     * Scope to filter by type
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Check if register is on-premise type
     */
    public function isOnPremise(): bool
    {
        return $this->type === self::TYPE_ON_PREMISE;
    }

    /**
     * Check if register is delivery type
     */
    public function isDelivery(): bool
    {
        return $this->type === self::TYPE_DELIVERY;
    }

    /**
     * Check if register is event type
     */
    public function isEvent(): bool
    {
        return $this->type === self::TYPE_EVENT;
    }
}
