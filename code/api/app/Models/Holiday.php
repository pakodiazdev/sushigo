<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Holiday extends Model
{
    use HasFactory;

    protected $fillable = [
        'date',
        'name',
        'pay_multiplier',
    ];

    protected $casts = [
        'date' => 'date',
        'pay_multiplier' => 'decimal:2',
    ];
}
