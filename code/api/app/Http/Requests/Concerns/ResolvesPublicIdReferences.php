<?php

namespace App\Http\Requests\Concerns;

use Illuminate\Database\Eloquent\Model;

/**
 * Resolves ULID public_id foreign-key inputs into the models/numeric ids the
 * Service layer still expects internally (see #293 — API responses expose
 * public_id, but the database FK columns remain numeric).
 */
trait ResolvesPublicIdReferences
{
    /**
     * @param  class-string<Model>  $modelClass
     */
    protected function resolveModelByPublicId(string $modelClass, string $field): Model
    {
        return $modelClass::where('public_id', $this->validated($field))->firstOrFail();
    }

    /**
     * @param  class-string<Model>  $modelClass
     */
    protected function resolvePublicId(string $modelClass, string $field): ?int
    {
        return $this->resolvePublicIdValue($modelClass, $this->validated($field));
    }

    /**
     * @param  class-string<Model>  $modelClass
     */
    protected function resolvePublicIdValue(string $modelClass, ?string $publicId): ?int
    {
        if (! $publicId) {
            return null;
        }

        return $modelClass::where('public_id', $publicId)->value('id');
    }
}
