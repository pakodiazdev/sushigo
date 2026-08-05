<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class DishCategory extends Model
{
    use HasFactory, HasPublicId, SoftDeletes;

    protected $fillable = [
        'name',
        'position',
        'is_active',
    ];

    protected $casts = [
        'position' => 'integer',
        'is_active' => 'boolean',
    ];

    public function dishes(): HasMany
    {
        return $this->hasMany(Dish::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    protected static function booted(): void
    {
        static::deleting(function (DishCategory $category) {
            // get()->each() (not the query builder's chunked each()) — chunking would
            // re-page with OFFSET while rows are being soft-deleted out of the default
            // scope mid-iteration, silently skipping some dishes.
            $category->dishes()->get()->each(fn (Dish $dish) => $dish->delete());
        });
    }
}
