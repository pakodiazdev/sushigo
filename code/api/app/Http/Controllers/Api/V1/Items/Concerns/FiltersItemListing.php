<?php

namespace App\Http\Controllers\Api\V1\Items\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

trait FiltersItemListing
{
    protected function applyIsActiveFilter(Builder $query, Request $request): void
    {
        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }
    }

    /**
     * @param  array<int, string>  $fields
     */
    protected function applySearchFilter(Builder $query, Request $request, array $fields): void
    {
        if (! $request->filled('search')) {
            return;
        }

        $search = $request->search;

        $query->where(function (Builder $q) use ($search, $fields) {
            foreach ($fields as $index => $field) {
                $method = $index === 0 ? 'where' : 'orWhere';
                $q->{$method}($field, 'ILIKE', "%{$search}%");
            }
        });
    }

    protected function resolvePerPage(Request $request): int
    {
        return (int) $request->input('per_page', 15);
    }
}
