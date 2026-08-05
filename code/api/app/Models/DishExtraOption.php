<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class DishExtraOption extends Model
{
    use HasFactory, HasPublicId, SoftDeletes;

    protected $fillable = [
        'dish_extra_group_id',
        'name',
        'price_delta',
        'is_active',
        'position',
    ];

    protected $casts = [
        'price_delta' => 'decimal:2',
        'is_active' => 'boolean',
        'position' => 'integer',
    ];

    public function extraGroup(): BelongsTo
    {
        return $this->belongsTo(DishExtraGroup::class, 'dish_extra_group_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
