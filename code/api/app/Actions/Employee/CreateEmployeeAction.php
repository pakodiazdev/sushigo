<?php

namespace App\Actions\Employee;

use App\Actions\Auth\SendWelcomeNotificationAction;
use App\Models\Employee;
use App\Models\User;
use App\Repositories\EmployeeRepository;
use App\Repositories\UserRepository;
use Closure;
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
     *
     * $afterCreate (optional) runs inside the same transaction, right after
     * the employee/user/employment period are created — e.g. attaching an
     * uploaded avatar gallery to the new user (#401). Running it here,
     * rather than after this method returns, keeps it atomic with the rest
     * of creation: if it throws, the whole employee/user creation rolls
     * back instead of leaving a created employee with a silently-orphaned
     * upload.
     */
    public function __invoke(array $data, ?Closure $afterCreate = null): Employee
    {
        $employee = DB::transaction(function () use ($data, $afterCreate) {
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

            $employee = $employee->load(['user.roles', 'employmentPeriods.branch']);

            if ($afterCreate) {
                $afterCreate($employee);
            }

            return $employee;
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

        return $this->userRepository->create([
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'phone_country' => isset($data['phone']) ? $phoneCountry : null,
            'password' => Hash::make($plainPassword),
        ]);
    }
}
