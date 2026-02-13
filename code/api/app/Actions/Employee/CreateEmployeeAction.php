<?php

namespace App\Actions\Employee;

use App\Actions\Auth\SendWelcomeNotificationAction;
use App\Models\Employee;
use App\Models\User;
use App\Repositories\Contracts\EmployeeRepositoryInterface;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CreateEmployeeAction
{
    public function __construct(
        private readonly EmployeeRepositoryInterface $employeeRepository,
        private readonly UserRepositoryInterface $userRepository,
        private readonly SendWelcomeNotificationAction $sendWelcomeNotification,
    ) {}

    /**
     * Create an employee with a linked system user.
     *
     * Every employee gets a system user created automatically.
     * The user is created with a random password — they must set their
     * own password via the reset link sent by email or WhatsApp.
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
                'is_active' => $data['is_active'] ?? true,
                'meta' => $data['meta'] ?? null,
            ]);

            // Assign position roles via Spatie on the Employee model
            $roles = $data['roles'] ?? [];
            $employee->syncPositionRoles($roles);

            // Send welcome notification with password reset link
            // (outside transaction concern: notification is fire-and-forget)
            ($this->sendWelcomeNotification)($user);

            return $employee->load(['user', 'roles']);
        });
    }

    /**
     * Create a system User linked to the employee.
     * User is created with a random password — must be reset via the welcome link.
     */
    private function createUserForEmployee(array $data): User
    {
        // Get default phone country from config (hardcoded +52 for Mexico in v1)
        $phoneCountry = config('employees.default_phone_country');

        $user = $this->userRepository->create([
            'name' => "{$data['first_name']} {$data['last_name']}",
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'phone_country' => isset($data['phone']) ? $phoneCountry : null,
            'password' => Str::random(32),
        ]);

        return $user;
    }
}
