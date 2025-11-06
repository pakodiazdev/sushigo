<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class OperatingUnit extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'branch_id',
        'name',
        'type',
        'start_date',
        'end_date',
        'is_active',
        'meta',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_active' => 'boolean',
        'meta' => 'array',
    ];

    // Type constants
    public const TYPE_BRANCH_MAIN = 'BRANCH_MAIN';
    public const TYPE_BRANCH_BUFFER = 'BRANCH_BUFFER';
    public const TYPE_BRANCH_RETURN = 'BRANCH_RETURN';
    public const TYPE_EVENT_TEMP = 'EVENT_TEMP';

    /**
     * Get the branch that owns this operating unit
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get all inventory locations for this unit
     */
    public function inventoryLocations(): HasMany
    {
        return $this->hasMany(InventoryLocation::class);
    }

    /**
     * Get the primary inventory location
     */
    public function primaryLocation()
    {
        return $this->inventoryLocations()->where('is_primary', true)->first();
    }

    /**
     * Get assigned users
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'operating_unit_users')
            ->withPivot('assignment_role', 'is_active', 'meta')
            ->withTimestamps();
    }

    /**
     * Get active assigned users
     */
    public function activeUsers(): BelongsToMany
    {
        return $this->users()->wherePivot('is_active', true);
    }

    /**
     * Scope to filter active units
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter by type
     */
    public function scopeType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope to filter main branch units
     */
    public function scopeMainBranch($query)
    {
        return $query->where('type', self::TYPE_BRANCH_MAIN);
    }

    /**
     * Scope to filter event units
     */
    public function scopeEvents($query)
    {
        return $query->where('type', self::TYPE_EVENT_TEMP);
    }

    /**
     * Scope to filter active events (within date range)
     */
    public function scopeActiveEvents($query)
    {
        return $query->where('type', self::TYPE_EVENT_TEMP)
            ->where('is_active', true)
            ->where('start_date', '<=', now())
            ->where(function ($q) {
                $q->whereNull('end_date')
                    ->orWhere('end_date', '>=', now());
            });
    }

    /**
     * Check if this is a temporary event unit
     */
    public function isEvent(): bool
    {
        return $this->type === self::TYPE_EVENT_TEMP;
    }

    /**
     * Check if this is the main branch unit
     */
    public function isMainBranch(): bool
    {
        return $this->type === self::TYPE_BRANCH_MAIN;
    }
}
