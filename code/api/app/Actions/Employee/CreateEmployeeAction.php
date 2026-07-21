<?php

namespace App\Actions\Employee;

use App\Actions\Auth\SendWelcomeNotificationAction;
use App\Models\Employee;
use App\Models\User;
use App\Repositories\EmployeeRepository;
use App\Repositories\UserRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class CreateEmployeeAction
{
    public function __construct(
        private readonly EmployeeRepository $employeeRepository,
        private readonly UserRepository $userRepository,
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
        $employee = DB::transaction(function () use ($data) {
            $user = $this->createUserForEmployee($data);

            $employee = $this->employeeRepository->create([
                'user_id' => $user->id,
                'code' => $data['code'],
                'is_active' => $data['is_active'] ?? true,
                'attendance_exempt' => $data['attendance_exempt'] ?? false,
                'meta' => $data['meta'] ?? null,
            ]);

            $roles = $data['roles'] ?? [];
            $employee->syncPositionRoles($roles, auth()->user());

            $employee->employmentPeriods()->create([
                'branch_id' => $data['branch_id'],
                'start_date' => $data['start_date'],
                'is_active' => true,
            ]);

            return $employee->load(['user.roles', 'employmentPeriods.branch']);
        });

        try {
            ($this->sendWelcomeNotification)($employee->user);
        } catch (Throwable $e) {
            Log::warning('Failed to send welcome notification', ['error' => $e->getMessage()]);
        }

        return $employee;
    }

    private function createUserForEmployee(array $data): User
    {
        // Get default phone country from config (hardcoded +52 for Mexico in v1)
        $phoneCountry = config('employees.default_phone_country');

        // Allow seeder or caller to specify a plain password for development/testing.
        // If provided, hash it; otherwise generate a random password.
        $plainPassword = $data['password'] ?? Str::random(32);

        $user = $this->userRepository->create([
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'phone_country' => isset($data['phone']) ? $phoneCountry : null,
            'password' => Hash::make($plainPassword),
        ]);

        return $user;
    }
}
