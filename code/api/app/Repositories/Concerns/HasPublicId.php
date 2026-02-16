<?php

namespace App\Repositories\Concerns;

use Illuminate\Database\Eloquent\Model;

trait HasPublicId
{
    public function findByPublicIdOrFail(string $publicId): Model
    {
        return $this->newQuery()->where('public_id', $publicId)->firstOrFail();
    }
}
