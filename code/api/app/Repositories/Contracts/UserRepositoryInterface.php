<?php

namespace App\Repositories\Contracts;

use App\Models\User;

interface UserRepositoryInterface
{
    /**
     * Create a new user.
     */
    public function create(array $data): User;

    /**
     * Find a user by ID or fail.
     */
    public function findOrFail(int $id): User;
}
