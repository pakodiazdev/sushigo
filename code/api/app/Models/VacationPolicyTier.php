<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;

class VacationPolicyTier extends Model
{
    use HasPublicId;

    protected $fillable = [
        'years_from',
        'days',
        'sort_order',
    ];

    protected $casts = [
        'years_from' => 'integer',
        'days' => 'integer',
        'sort_order' => 'integer',
    ];
}
