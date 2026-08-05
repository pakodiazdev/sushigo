<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class DishExtraGroup extends Model
{
    use HasFactory, HasPublicId, SoftDeletes;

    public const SELECTION_SINGLE = 'SINGLE';

    public const SELECTION_MULTIPLE = 'MULTIPLE';

    protected $fillable = [
        'dish_id',
        'name',
        'is_required',
        'selection_type',
    ];

    protected $casts = [
        'is_required' => 'boolean',
    ];

    public function dish(): BelongsTo
    {
        return $this->belongsTo(Dish::class);
    }

    public function options(): HasMany
    {
        return $this->hasMany(DishExtraOption::class)->orderBy('position');
    }

    protected static function booted(): void
    {
        static::deleting(function (DishExtraGroup $group) {
            // get()->each() — see DishCategory::booted() for why the query builder's
            // chunked each() is unsafe here.
            $group->options()->get()->each(fn (DishExtraOption $option) => $option->delete());
        });
    }
}
