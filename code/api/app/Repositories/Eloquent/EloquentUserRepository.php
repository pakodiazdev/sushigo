<?php

namespace App\Repositories\Eloquent;

use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;

class EloquentUserRepository implements UserRepositoryInterface
{
    public function __construct(
        private readonly User $model
    ) {}

    /**
     * {@inheritDoc}
     */
    public function create(array $data): User
    {
        return $this->model->newQuery()->create($data);
    }

    /**
     * {@inheritDoc}
     */
    public function findOrFail(int $id): User
    {
        return $this->model->newQuery()->findOrFail($id);
    }
}
