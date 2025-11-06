<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Branch extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'code',
        'name',
        'region',
        'timezone',
        'is_active',
        'meta',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'meta' => 'array',
    ];

    /**
     * Get all operating units for this branch
     */
    public function operatingUnits(): HasMany
    {
        return $this->hasMany(OperatingUnit::class);
    }

    /**
     * Get active operating units
     */
    public function activeOperatingUnits(): HasMany
    {
        return $this->operatingUnits()->where('is_active', true);
    }

    /**
     * Scope to filter active branches
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter by region
     */
    public function scopeRegion($query, string $region)
    {
        return $query->where('region', $region);
    }
}
