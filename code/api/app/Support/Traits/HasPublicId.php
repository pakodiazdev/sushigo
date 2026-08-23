<?php

namespace App\Support\Traits;

use Illuminate\Support\Str;

trait HasPublicId
{
    public static function bootHasPublicId(): void
    {
        static::creating(fn ($model) => $model->public_id = $model->public_id ?: (string) Str::ulid()
        );
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    /**
     * Resolve an API identifier while retaining the numeric key exclusively
     * for internal relations and database queries.
     */
    public static function findByPublicIdOrFail(string $publicId): static
    {
        return static::where('public_id', $publicId)->firstOrFail();
    }
}
