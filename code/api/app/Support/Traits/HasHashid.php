<?php

namespace App\Support\Traits;

use Illuminate\Database\Eloquent\Model;

trait HasHashid
{
    public function getHashidAttribute(): string
    {
        return app('hashids')->encode($this->getKey());
    }

    public function getRouteKey(): string
    {
        return $this->hashid;
    }

    public function resolveRouteBinding($value, $field = null): ?Model
    {
        if ($field) {
            return $this->where($field, $value)->first();
        }

        $decoded = app('hashids')->decode($value);

        if (empty($decoded)) {
            return null;
        }

        return $this->newQuery()->find($decoded[0]);
    }
}
