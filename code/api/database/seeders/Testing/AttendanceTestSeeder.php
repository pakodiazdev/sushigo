<?php

namespace Database\Seeders\Testing;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Attendance test seeder — employees + schedules for attendance Cypress specs.
 *
 * Creates: 8 config employees (EMP-001..EMP-008) with user accounts, employment
 * periods, position roles, schedules (Mon-Sat 13:00-22:00, Sun rest, 30-min lunch),
 * plus admin employee profiles (ADM-001 for admin, ADM-002 for inventory).
 *
 * No idempotency checks — always starts from truncated tables.
 * Optimized for speed: bulk DB::table()->insert(), single Hash::make(), no Eloquent events.
 * ULIDs generated manually for models that use HasPublicId.
 */
class AttendanceTestSeeder extends Seeder
{
    /** Staggered lunch templates: 30 min each, every 30 min from 15:00 to 20:00 */
    private const LUNCH_TEMPLATES = [
        ['15:00:00', '15:30:00'],
        ['15:30:00', '16:00:00'],
        ['16:00:00', '16:30:00'],
        ['16:30:00', '17:00:00'],
        ['17:00:00', '17:30:00'],
        ['17:30:00', '18:00:00'],
        ['18:00:00', '18:30:00'],
        ['18:30:00', '19:00:00'],
        ['19:00:00', '19:30:00'],
        ['19:30:00', '20:00:00'],
    ];

    private const SHIFT_START = '13:00:00';

    private const SHIFT_END = '22:00:00';

    public function run(): void
    {
        $now = now();
        $hireDate = $now->copy()->subYear()->toDateString();
        $hashedPassword = Hash::make('employee123456');

        $branchId = DB::table('branches')->where('code', 'MAIN')->value('id');
        $roleMap = DB::table('roles')->where('guard_name', 'api')->pluck('id', 'name')->toArray();

        $configEmployees = config('seeders.development_employees', []);
        $adminProfiles = $this->adminProfiles();

        $userIdMap = $this->seedUsers($configEmployees, $hashedPassword, $adminProfiles, $now);
        $this->seedRoleAssignments($configEmployees, $adminProfiles, $userIdMap, $roleMap);
        $employeeIdMap = $this->seedEmployees($configEmployees, $adminProfiles, $userIdMap, $now);
        $periodIdMap = $this->seedEmploymentPeriods($employeeIdMap, $branchId, $hireDate, $now);
        $scheduleData = $this->seedSchedules($employeeIdMap, $periodIdMap, $hireDate, $now);
        $this->seedScheduleDays($scheduleData, $now);
    }

    private function adminProfiles(): array
    {
        return [
            [
                'email' => 'admin@sushigo.com',
                'code' => 'ADM-001',
                'first_name' => 'Admin',
                'last_name' => 'User',
                'roles' => ['manager'],
            ],
            [
                'email' => 'inventory@sushigo.com',
                'code' => 'ADM-002',
                'first_name' => 'Inventory',
                'last_name' => 'Manager',
                'roles' => ['manager'],
            ],
        ];
    }

    /**
     * @return array<string, int> email => user_id
     */
    private function seedUsers(array $configEmployees, string $hashedPassword, array $adminProfiles, $now): array
    {
        $userRows = [];
        foreach ($configEmployees as $emp) {
            $userRows[] = [
                'name' => $emp['first_name'].' '.$emp['last_name'],
                'email' => $emp['email'],
                'phone' => $emp['phone'] ?? null,
                'password' => $hashedPassword,
                'email_verified_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }
        DB::table('users')->insert($userRows);

        $emails = array_merge(
            array_column($configEmployees, 'email'),
            array_column($adminProfiles, 'email'),
        );

        return DB::table('users')
            ->whereIn('email', $emails)
            ->pluck('id', 'email')
            ->toArray();
    }

    private function seedRoleAssignments(array $configEmployees, array $adminProfiles, array $userIdMap, array $roleMap): void
    {
        $userModel = User::class;
        $rolePivots = [];

        foreach ($configEmployees as $emp) {
            $userId = $userIdMap[$emp['email']];
            foreach ($emp['roles'] ?? [] as $roleName) {
                if (isset($roleMap[$roleName])) {
                    $rolePivots[] = [
                        'role_id' => $roleMap[$roleName],
                        'model_type' => $userModel,
                        'model_id' => $userId,
                    ];
                }
            }
        }

        $adminPivots = $this->buildAdminRolePivots($adminProfiles, $userIdMap, $roleMap, $userModel);
        $rolePivots = array_merge($rolePivots, $adminPivots);

        if ($rolePivots) {
            DB::table('model_has_roles')->insert($rolePivots);
        }
    }

    private function buildAdminRolePivots(array $adminProfiles, array $userIdMap, array $roleMap, string $userModel): array
    {
        $existingRoles = DB::table('model_has_roles')
            ->where('model_type', $userModel)
            ->whereIn('model_id', array_values($userIdMap))
            ->get()
            ->groupBy('model_id')
            ->map(fn ($rows) => $rows->pluck('role_id')->toArray())
            ->toArray();

        $pivots = [];
        foreach ($adminProfiles as $profile) {
            $userId = $userIdMap[$profile['email']] ?? null;
            if (! $userId) {
                continue;
            }
            foreach ($profile['roles'] as $roleName) {
                $roleId = $roleMap[$roleName] ?? null;
                if ($roleId && ! in_array($roleId, $existingRoles[$userId] ?? [])) {
                    $pivots[] = [
                        'role_id' => $roleId,
                        'model_type' => $userModel,
                        'model_id' => $userId,
                    ];
                }
            }
        }

        return $pivots;
    }

    /**
     * @return array<string, int> code => employee_id
     */
    private function seedEmployees(array $configEmployees, array $adminProfiles, array $userIdMap, $now): array
    {
        $allEmployees = [];
        foreach ($configEmployees as $emp) {
            $allEmployees[] = [
                'code' => $emp['code'],
                'first_name' => $emp['first_name'],
                'last_name' => $emp['last_name'],
                'user_id' => $userIdMap[$emp['email']],
                'meta' => isset($emp['meta']) ? json_encode($emp['meta']) : null,
            ];
        }
        foreach ($adminProfiles as $profile) {
            $userId = $userIdMap[$profile['email']] ?? null;
            if ($userId) {
                $allEmployees[] = [
                    'code' => $profile['code'],
                    'first_name' => $profile['first_name'],
                    'last_name' => $profile['last_name'],
                    'user_id' => $userId,
                    'meta' => null,
                ];
            }
        }

        $employeeRows = [];
        foreach ($allEmployees as $emp) {
            $employeeRows[] = [
                'user_id' => $emp['user_id'],
                'code' => $emp['code'],
                'first_name' => $emp['first_name'],
                'last_name' => $emp['last_name'],
                'is_active' => true,
                'public_id' => (string) Str::ulid(),
                'meta' => $emp['meta'],
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }
        DB::table('employees')->insert($employeeRows);

        return DB::table('employees')
            ->whereIn('code', array_column($allEmployees, 'code'))
            ->pluck('id', 'code')
            ->toArray();
    }

    /**
     * @return array<int, int> employee_id => period_id
     */
    private function seedEmploymentPeriods(array $employeeIdMap, int $branchId, string $hireDate, $now): array
    {
        $periodRows = [];
        foreach ($employeeIdMap as $employeeId) {
            $periodRows[] = [
                'employee_id' => $employeeId,
                'branch_id' => $branchId,
                'start_date' => $hireDate,
                'end_date' => null,
                'termination_reason' => null,
                'is_active' => true,
                'public_id' => (string) Str::ulid(),
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }
        DB::table('employment_periods')->insert($periodRows);

        return DB::table('employment_periods')
            ->where('is_active', true)
            ->whereIn('employee_id', array_values($employeeIdMap))
            ->pluck('id', 'employee_id')
            ->toArray();
    }

    /**
     * @return array<int, array> schedule rows with _index for lunch template assignment
     */
    private function seedSchedules(array $employeeIdMap, array $periodIdMap, string $hireDate, $now): array
    {
        $scheduleRows = [];
        $employeeCodes = array_keys($employeeIdMap);
        foreach ($employeeCodes as $index => $code) {
            $employeeId = $employeeIdMap[$code];
            $periodId = $periodIdMap[$employeeId] ?? null;
            if (! $periodId) {
                continue;
            }
            $scheduleRows[] = [
                'employment_period_id' => $periodId,
                'effective_from' => $hireDate,
                'effective_to' => null,
                'workday_type' => 'FULL',
                'working_days_per_week' => 6,
                'public_id' => (string) Str::ulid(),
                'created_at' => $now,
                'updated_at' => $now,
                '_index' => $index,
            ];
        }

        $cleanRows = array_map(fn ($row) => array_diff_key($row, ['_index' => true]), $scheduleRows);
        DB::table('employee_schedules')->insert($cleanRows);

        $scheduleIdMap = DB::table('employee_schedules')
            ->whereIn('employment_period_id', array_column($scheduleRows, 'employment_period_id'))
            ->pluck('id', 'employment_period_id')
            ->toArray();

        // Attach resolved schedule IDs for day generation
        foreach ($scheduleRows as &$row) {
            $row['_schedule_id'] = $scheduleIdMap[$row['employment_period_id']] ?? null;
        }

        return $scheduleRows;
    }

    private function seedScheduleDays(array $scheduleRows, $now): void
    {
        $dayRows = [];
        $templateCount = count(self::LUNCH_TEMPLATES);

        foreach ($scheduleRows as $schedule) {
            $scheduleId = $schedule['_schedule_id'] ?? null;
            if (! $scheduleId) {
                continue;
            }

            $templateIndex = $schedule['_index'] % $templateCount;
            $lunchStart = self::LUNCH_TEMPLATES[$templateIndex][0];
            $lunchEnd = self::LUNCH_TEMPLATES[$templateIndex][1];

            for ($dow = 1; $dow <= 7; $dow++) {
                $dayRows[] = $dow === 7
                    ? $this->restDayRow($scheduleId, $dow, $now)
                    : $this->workDayRow($scheduleId, $dow, $lunchStart, $lunchEnd, $now);
            }
        }

        foreach (array_chunk($dayRows, 50) as $chunk) {
            DB::table('schedule_days')->insert($chunk);
        }
    }

    private function restDayRow(int $scheduleId, int $dow, $now): array
    {
        return [
            'employee_schedule_id' => $scheduleId,
            'day_of_week' => $dow,
            'is_day_off' => true,
            'expected_start' => null,
            'expected_lunch_start' => null,
            'expected_lunch_end' => null,
            'expected_end' => null,
            'lunch_duration_minutes' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }

    private function workDayRow(int $scheduleId, int $dow, string $lunchStart, string $lunchEnd, $now): array
    {
        return [
            'employee_schedule_id' => $scheduleId,
            'day_of_week' => $dow,
            'is_day_off' => false,
            'expected_start' => self::SHIFT_START,
            'expected_lunch_start' => $lunchStart,
            'expected_lunch_end' => $lunchEnd,
            'expected_end' => self::SHIFT_END,
            'lunch_duration_minutes' => 30,
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }
}
