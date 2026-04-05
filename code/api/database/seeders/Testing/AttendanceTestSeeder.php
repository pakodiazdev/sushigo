<?php

namespace Database\Seeders\Testing;

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
        $userModel = 'App\\Models\\User';

        // Fetch IDs we need from CoreTestSeeder data
        $branchId = DB::table('branches')->where('code', 'MAIN')->value('id');
        $roleMap = DB::table('roles')->where('guard_name', 'api')->pluck('id', 'name')->toArray();

        // ── Build all employee data arrays ──────────────────────────────
        $configEmployees = config('seeders.development_employees', []);

        // Admin profiles to link to existing users
        $adminProfiles = [
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

        // ── 1. Bulk insert users for config employees ───────────────────
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

        // Map email => user_id for all users (config + already-existing admin/inventory)
        $emails = array_merge(
            array_column($configEmployees, 'email'),
            array_column($adminProfiles, 'email'),
        );
        $userIdMap = DB::table('users')
            ->whereIn('email', $emails)
            ->pluck('id', 'email')
            ->toArray();

        // ── 2. Bulk insert role assignments for config employees ────────
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

        // Admin profile role assignments (only if user doesn't already have the role)
        $existingRoles = DB::table('model_has_roles')
            ->where('model_type', $userModel)
            ->whereIn('model_id', array_values($userIdMap))
            ->get()
            ->groupBy('model_id')
            ->map(fn ($rows) => $rows->pluck('role_id')->toArray())
            ->toArray();

        foreach ($adminProfiles as $profile) {
            $userId = $userIdMap[$profile['email']] ?? null;
            if (! $userId) {
                continue;
            }
            foreach ($profile['roles'] as $roleName) {
                $roleId = $roleMap[$roleName] ?? null;
                if ($roleId && ! in_array($roleId, $existingRoles[$userId] ?? [])) {
                    $rolePivots[] = [
                        'role_id' => $roleId,
                        'model_type' => $userModel,
                        'model_id' => $userId,
                    ];
                }
            }
        }

        if ($rolePivots) {
            DB::table('model_has_roles')->insert($rolePivots);
        }

        // ── 3. Bulk insert employees (HasPublicId → manual ULID) ────────
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

        // Map code => employee_id
        $employeeIdMap = DB::table('employees')
            ->whereIn('code', array_column($allEmployees, 'code'))
            ->pluck('id', 'code')
            ->toArray();

        // ── 4. Bulk insert employment periods (HasPublicId → manual ULID)
        $periodRows = [];
        foreach ($employeeIdMap as $code => $employeeId) {
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

        // Map employee_id => period_id
        $periodIdMap = DB::table('employment_periods')
            ->where('is_active', true)
            ->whereIn('employee_id', array_values($employeeIdMap))
            ->pluck('id', 'employee_id')
            ->toArray();

        // ── 5. Bulk insert schedules (HasPublicId → manual ULID) ──��─────
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
                '_index' => $index, // temp: for lunch template assignment
            ];
        }

        // Remove temp key before insert
        $cleanRows = array_map(fn ($row) => array_diff_key($row, ['_index' => true]), $scheduleRows);
        DB::table('employee_schedules')->insert($cleanRows);

        // Map period_id => schedule_id
        $scheduleIdMap = DB::table('employee_schedules')
            ->whereIn('employment_period_id', array_column($scheduleRows, 'employment_period_id'))
            ->pluck('id', 'employment_period_id')
            ->toArray();

        // ── 6. Bulk insert schedule days (7 per schedule) ───────────────
        $dayRows = [];
        $templateCount = count(self::LUNCH_TEMPLATES);

        foreach ($scheduleRows as $schedule) {
            $periodId = $schedule['employment_period_id'];
            $scheduleId = $scheduleIdMap[$periodId] ?? null;
            if (! $scheduleId) {
                continue;
            }

            $templateIndex = $schedule['_index'] % $templateCount;
            $lunchStart = self::LUNCH_TEMPLATES[$templateIndex][0];
            $lunchEnd = self::LUNCH_TEMPLATES[$templateIndex][1];

            for ($dow = 1; $dow <= 7; $dow++) {
                if ($dow === 7) {
                    // Sunday — rest day
                    $dayRows[] = [
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
                } else {
                    // Mon-Sat — working day
                    $dayRows[] = [
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
        }

        // Insert in chunks to avoid exceeding PostgreSQL parameter limit
        foreach (array_chunk($dayRows, 50) as $chunk) {
            DB::table('schedule_days')->insert($chunk);
        }
    }
}
