<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;

class OvertimeLftTier extends Model
{
    use HasPublicId;

    protected $fillable = [
        'factor',
        'up_to_hours',
        'sort_order',
    ];

    protected $casts = [
        'factor' => 'decimal:2',
        'up_to_hours' => 'decimal:2',
        'sort_order' => 'integer',
    ];

    /**
     * Returns true if the given accumulated hours fall within this tier.
     * A null up_to_hours means the tier is open-ended (applies from here onward).
     */
    public function matches(float $hours): bool
    {
        return $this->up_to_hours === null || $hours <= (float) $this->up_to_hours;
    }
}
