<?php

declare(strict_types=1);

namespace App\Http\Requests\Dishes\Dish\Concerns;

use App\Http\Requests\Concerns\ResolvesPublicIdReferences;
use App\Models\DishCategory;

trait NormalizesDishData
{
    use ResolvesPublicIdReferences;

    /**
     * Resolves dish_category_id from its public_id to the internal id shared
     * by Store/Update, defaulting is_active/position only on create — Update
     * must leave omitted fields untouched.
     *
     * @return array<string, mixed>
     */
    protected function normalizedDishData(bool $applyCreateDefaults): array
    {
        $data = $this->validated();

        if (array_key_exists('dish_category_id', $data)) {
            $data['dish_category_id'] = $this->resolvePublicIdValue(DishCategory::class, $data['dish_category_id']);
        }

        if ($applyCreateDefaults) {
            $data['is_active'] ??= true;
            $data['position'] ??= 0;
        }

        return $data;
    }
}
