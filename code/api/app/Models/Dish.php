<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Dish extends Model
{
    use HasFactory, HasPublicId, SoftDeletes;

    protected $fillable = [
        'dish_category_id',
        'name',
        'description',
        'base_price',
        'is_active',
        'position',
    ];

    protected $casts = [
        'base_price' => 'decimal:2',
        'is_active' => 'boolean',
        'position' => 'integer',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(DishCategory::class, 'dish_category_id');
    }

    public function extraGroups(): HasMany
    {
        // dish_extra_groups has no position column (unlike categories/dishes/
        // options) — order by id so payload order is at least deterministic
        // instead of whatever the DB happens to return.
        return $this->hasMany(DishExtraGroup::class)->orderBy('id');
    }

    /**
     * Get media attachments (polymorphic)
     */
    public function mediaAttachments(): MorphMany
    {
        return $this->morphMany(MediaAttachment::class, 'attachable');
    }

    /**
     * Get primary media gallery
     */
    public function primaryMediaGallery()
    {
        return $this->mediaAttachments()
            ->where('is_primary', true)
            ->with('mediaGallery')
            ->first()
            ?->mediaGallery;
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Total price for this dish given a set of selected extra option IDs.
     * Options not belonging to this dish, or no longer active, are ignored.
     *
     * @param  array<int, int>  $selectedOptionIds
     */
    public function totalPriceFor(array $selectedOptionIds): float
    {
        $priceDeltas = DishExtraOption::query()
            ->whereIn('id', $selectedOptionIds)
            ->where('is_active', true)
            ->whereHas('extraGroup', fn ($query) => $query->where('dish_id', $this->id))
            ->get()
            ->sum(fn (DishExtraOption $option) => (float) $option->price_delta);

        return round((float) $this->base_price + $priceDeltas, 2);
    }

    protected static function booted(): void
    {
        static::deleting(function (Dish $dish) {
            // get()->each() — see DishCategory::booted() for why the query builder's
            // chunked each() is unsafe here.
            $dish->extraGroups()->get()->each(fn (DishExtraGroup $group) => $group->delete());
        });
    }
}
