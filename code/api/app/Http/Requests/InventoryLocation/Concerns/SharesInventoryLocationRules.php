<?php

namespace App\Http\Requests\InventoryLocation\Concerns;

trait SharesInventoryLocationRules
{
    /**
     * Validation rules shared by Create and Update — fields whose
     * constraints do not change between the two requests.
     *
     * @return array<string, array<int, string>>
     */
    protected function sharedLocationFieldRules(): array
    {
        return [
            'code' => ['nullable', 'string', 'max:50'],
            'priority' => ['nullable', 'integer', 'min:0', 'max:1000'],
            'is_primary' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'is_pickable' => ['nullable', 'boolean'],
            // Not `nullable`: this maps to a NOT NULL column, so an explicit
            // `can_receive_purchases: null` must fail with 422 rather than reach
            // the DB and surface as a 500. An absent key is still left untouched.
            'can_receive_purchases' => ['boolean'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
