<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Database\Eloquent\Model;

/**
 * Resolves a ULID public_id query-param filter into the numeric FK the
 * underlying table column stores (see #293 — List endpoints filter by the
 * same numeric FKs the migration hid from output, so a caller driving
 * requests purely from API responses can no longer supply a valid value).
 */
trait ResolvesPublicIdFilters
{
    /**
     * @param  class-string<Model>  $modelClass
     */
    protected function resolvePublicIdFilter(string $modelClass, ?string $publicId): ?int
    {
        if (! $publicId) {
            return null;
        }

        return $modelClass::where('public_id', $publicId)->value('id');
    }
}
