<?php

namespace App\Models;

use App\Enums\ClockMode;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Single-row model for Application Clock state.
 *
 * Invariant: exactly one row exists in this table.
 */
class ApplicationClockState extends Model
{
    protected $table = 'application_clock_state';

    protected $fillable = [
        'mode',
        'base_datetime_utc',
        'started_real_datetime_utc',
        'timezone',
        'updated_by',
    ];

    protected $casts = [
        'mode' => ClockMode::class,
        'base_datetime_utc' => 'datetime',
        'started_real_datetime_utc' => 'datetime',
    ];

    /**
     * Get the user who last updated the clock state.
     */
    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Get the single clock state row.
     *
     * Creates the default row if none exists (for safety in edge cases).
     */
    public static function current(): self
    {
        return self::firstOrCreate(
            ['id' => 1],
            [
                'mode' => ClockMode::SYSTEM,
                'timezone' => config('app.business_timezone', 'America/Mexico_City'),
            ]
        );
    }
}
