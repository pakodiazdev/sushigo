<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;

class PunctualityBonusGroup extends Model
{
    use HasPublicId;

    protected $fillable = [
        'name',
        'weekly_bonus_amount',
        'working_days_divisor',
        'is_active',
    ];

    protected $casts = [
        'weekly_bonus_amount' => 'decimal:2',
        'working_days_divisor' => 'integer',
        'is_active' => 'boolean',
    ];

    public function dailyBonusAmount(): float
    {
        return round((float) $this->weekly_bonus_amount / $this->working_days_divisor, 2);
    }
}
