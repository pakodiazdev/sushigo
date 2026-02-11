<?php

namespace App\Repositories\Eloquent;

use App\Models\Employee;
use App\Repositories\Contracts\EmployeeRepositoryInterface;

class EloquentEmployeeRepository implements EmployeeRepositoryInterface
{
    public function __construct(
        private readonly Employee $model
    ) {}

    /**
     * {@inheritDoc}
     */
    public function create(array $data): Employee
    {
        return $this->model->newQuery()->create($data);
    }

    /**
     * {@inheritDoc}
     */
    public function update(Employee $employee, array $data): Employee
    {
        $employee->update($data);

        return $employee;
    }

    /**
     * {@inheritDoc}
     */
    public function findByPublicIdOrFail(string $publicId): Employee
    {
        return $this->model->newQuery()->where('public_id', $publicId)->firstOrFail();
    }
}
