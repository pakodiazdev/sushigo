<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;

class PunctualityRange extends Model
{
    use HasPublicId;

    protected $fillable = [
        'min_seconds',
        'max_seconds',
        'bonus_percentage',
        'sort_order',
    ];

    protected $casts = [
        'min_seconds' => 'integer',
        'max_seconds' => 'integer',
        'bonus_percentage' => 'decimal:2',
        'sort_order' => 'integer',
    ];

    /**
     * Returns true if the given lateness in seconds falls within this range.
     * A null max_seconds means the range is open-ended (≥ min_seconds).
     */
    public function matches(int $lateSeconds): bool
    {
        if ($lateSeconds < $this->min_seconds) {
            return false;
        }

        if ($this->max_seconds !== null && $lateSeconds > $this->max_seconds) {
            return false;
        }

        return true;
    }
}
