<?php

namespace App\Repositories\Contracts;

use App\Models\Employee;

interface EmployeeRepositoryInterface
{
    /**
     * Create a new employee.
     */
    public function create(array $data): Employee;

    /**
     * Update an existing employee.
     */
    public function update(Employee $employee, array $data): Employee;

    /**
     * Find an employee by public_id or fail.
     */
    public function findByPublicIdOrFail(string $publicId): Employee;
}
