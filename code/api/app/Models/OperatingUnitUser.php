<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OperatingUnitUser extends Model
{
    protected $fillable = [
        'user_id',
        'operating_unit_id',
        'assignment_role',
        'is_active',
        'meta',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'meta' => 'array',
    ];

    // Assignment role constants
    public const ROLE_OWNER = 'OWNER';
    public const ROLE_MANAGER = 'MANAGER';
    public const ROLE_CASHIER = 'CASHIER';
    public const ROLE_INVENTORY = 'INVENTORY';
    public const ROLE_AUDITOR = 'AUDITOR';

    /**
     * Get the user
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the operating unit
     */
    public function operatingUnit(): BelongsTo
    {
        return $this->belongsTo(OperatingUnit::class);
    }

    /**
     * Scope to filter active assignments
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter by assignment role
     */
    public function scopeRole($query, string $role)
    {
        return $query->where('assignment_role', $role);
    }
}
