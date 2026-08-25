<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use App\Support\Traits\SerializesPublicIdAsId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PriceList extends Model
{
    use HasFactory, HasPublicId, SerializesPublicIdAsId, SoftDeletes;

    protected $fillable = [
        'code',
        'name',
        'description',
        'priority',
        'is_active',
    ];

    protected $casts = [
        'priority' => 'integer',
        'is_active' => 'boolean',
    ];

    public function assignments(): HasMany
    {
        return $this->hasMany(PriceListAssignment::class);
    }

    public function variantPrices(): HasMany
    {
        return $this->hasMany(VariantPrice::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
