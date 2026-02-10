<?php

namespace App\Actions\Employee;

use App\Enums\EmployeeRole;
use App\Models\Employee;
use App\Models\User;
use App\Repositories\Contracts\EmployeeRepositoryInterface;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class CreateEmployeeAction
{
    public function __construct(
        private readonly EmployeeRepositoryInterface $employeeRepository,
        private readonly UserRepositoryInterface $userRepository,
    ) {}

    /**
     * Create an employee with a linked system user.
     *
     * Every employee gets a system user created automatically.
     * The user can be identified by email or phone number,
     * separating the employee's real profile from their operational system profile.
     */
    public function __invoke(array $data): Employee
    {
        return DB::transaction(function () use ($data) {
            $user = $this->createUserForEmployee($data);

            $employee = $this->employeeRepository->create([
                'user_id' => $user->id,
                'code' => $data['code'],
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'role' => $data['role'],
                'is_active' => $data['is_active'] ?? true,
                'meta' => $data['meta'] ?? null,
            ]);

            return $employee->load('user');
        });
    }

    /**
     * Create a system User linked to the employee with the appropriate Spatie role.
     * User can be created with email or phone number.
     */
    private function createUserForEmployee(array $data): User
    {
        $employeeRole = EmployeeRole::from(
            is_string($data['role']) ? $data['role'] : $data['role']->value
        );

        $user = $this->userRepository->create([
            'name' => "{$data['first_name']} {$data['last_name']}",
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'password' => Hash::make($data['password']),
        ]);

        $spatieRole = $employeeRole->spatieRole();
        $user->assignRole($spatieRole);

        return $user;
    }
}
