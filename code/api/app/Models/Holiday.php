<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Holiday extends Model
{
    use HasFactory;

    protected $fillable = [
        'definition_id',
        'date',
        'name',
        'type',
        'is_auto_generated',
        'pay_multiplier',
    ];

    protected $casts = [
        'date' => 'date',
        'pay_multiplier' => 'decimal:2',
        'is_auto_generated' => 'boolean',
    ];

    // ── Relations ─────────────────────────────────────────────────────────────

    public function holidayDefinition(): BelongsTo
    {
        return $this->belongsTo(HolidayDefinition::class, 'definition_id');
    }

    // ── Computed ──────────────────────────────────────────────────────────────

    /**
     * Returns the effective type: own type if set, else inherits from definition.
     */
    public function getEffectiveType(): ?string
    {
        return $this->type ?? $this->holidayDefinition?->type;
    }

    /**
     * Returns the effective pay multiplier.
     * If pay_multiplier is explicitly set on this instance and differs from the
     * definition's effective multiplier, the instance value acts as an override.
     * Otherwise inherits from the definition.
     */
    public function getEffectivePayMultiplier(): float
    {
        $definition = $this->holidayDefinition;

        if ($definition === null) {
            return (float) $this->pay_multiplier;
        }

        $definitionMultiplier = $definition->getEffectivePayMultiplier();

        if ((float) $this->pay_multiplier !== $definitionMultiplier) {
            return (float) $this->pay_multiplier;
        }

        return $definitionMultiplier;
    }
}
