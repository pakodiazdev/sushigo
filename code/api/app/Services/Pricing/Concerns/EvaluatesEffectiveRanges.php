<?php

namespace App\Services\Pricing\Concerns;

use Illuminate\Contracts\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Shared effective-date-range predicates for PriceListAssignment and
 * VariantPrice queries — both tables share the same effective_from
 * (required) / effective_to (nullable = open-ended) shape.
 */
trait EvaluatesEffectiveRanges
{
    /**
     * Restrict the query to rows whose effective window contains $date.
     */
    protected function whereEffectiveOn(Builder $query, Carbon $date): Builder
    {
        $day = $date->toDateString();

        return $query->where('effective_from', '<=', $day)
            ->where(function (Builder $q) use ($day) {
                $q->whereNull('effective_to')->orWhere('effective_to', '>=', $day);
            });
    }

    /**
     * Restrict the query to rows whose effective window overlaps
     * [$from, $to] ($to null = open-ended). Standard interval-overlap test
     * using a far-future sentinel in place of an open end, so it works the
     * same in every SQL driver without a DB-specific 'infinity' literal.
     */
    protected function whereOverlapsRange(Builder $query, string $from, ?string $to): Builder
    {
        $sentinel = '9999-12-31';

        return $query->where('effective_from', '<=', $to ?? $sentinel)
            ->where(function (Builder $q) use ($from) {
                $q->whereNull('effective_to')->orWhere('effective_to', '>=', $from);
            });
    }
}
