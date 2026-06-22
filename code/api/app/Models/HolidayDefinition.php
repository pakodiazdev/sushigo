<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HolidayDefinition extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'type',
        'pay_multiplier',
        'is_annual',
        'recurrence_type',
        'recurrence_config',
    ];

    protected $attributes = [
        'recurrence_config' => '{}',
    ];

    protected $casts = [
        'recurrence_config' => 'array',
        'is_annual' => 'boolean',
        'pay_multiplier' => 'decimal:2',
    ];

    // ── Relations ─────────────────────────────────────────────────────────────

    public function holidays(): HasMany
    {
        return $this->hasMany(Holiday::class, 'definition_id');
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeAnnual(Builder $query): Builder
    {
        return $query->where('is_annual', true);
    }

    // ── Computed ──────────────────────────────────────────────────────────────

    /**
     * Returns the effective pay multiplier based on holiday type.
     * - obligatorio → fixed 3.0 (LFT Art. 74)
     * - asueto      → fixed 2.0 (company convention)
     * - opcional    → own pay_multiplier (editable)
     */
    public function getEffectivePayMultiplier(): float
    {
        return match ($this->type) {
            'obligatorio' => 3.0,
            'asueto' => 1.0,
            default => (float) $this->pay_multiplier,
        };
    }
}
