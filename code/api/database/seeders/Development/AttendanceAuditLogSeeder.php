<?php

namespace Database\Seeders\Development;

use App\Enums\AuditAction;
use App\Models\Attendance;
use App\Models\AttendanceAuditLog;
use App\Models\Employee;
use App\Models\User;
use Database\Seeders\Base\RepeatableSeeder;
use Illuminate\Support\Collection;

/**
 * Seeds realistic AttendanceAuditLog entries for development, anchored to REAL
 * Attendance rows produced by AttendanceHistorySeeder (which must run first).
 *
 * Each scenario represents a real-world edit case an Admin would review in the
 * audit log viewer (issue #084):
 *
 *   - EMP-001: Admin corrects a check-in time from a previous day (RF-18)
 *   - EMP-002: Admin corrects a check-out after the employee forgot to clock out (RF-18)
 *   - EMP-003: Admin changes a day status from ABSENCE to LEAVE after documentation (RF-18)
 *   - EMP-004: Manager registers an attendance that was missing (CREATE audit)
 *   - EMP-005: Admin removes a duplicate attendance entry (DELETE audit)
 *
 * Dates are always relative to "today" (subDays) so the demo data never goes
 * stale — every scenario shows up within the last ~3 weeks regardless of when
 * the seeder runs.
 *
 * Uses RepeatableSeeder so it can be re-run in development to refresh demo data.
 */
class AttendanceAuditLogSeeder extends RepeatableSeeder
{
    public function run(): void
    {
        $admin = User::whereHas('roles', fn ($q) => $q->where('name', 'admin'))->first();
        $superAdmin = User::whereHas('roles', fn ($q) => $q->where('name', 'super-admin'))->first();
        $manager = User::whereHas('roles', fn ($q) => $q->where('name', 'manager'))->first();

        if (! $admin && ! $superAdmin) {
            $this->command->warn('⚠️  No admin/super-admin user found. Skipping AttendanceAuditLogSeeder.');

            return;
        }

        $actorAdmin = $admin ?? $superAdmin;
        $actorManager = $manager ?? $actorAdmin;

        $count = 0;

        if ($employee = Employee::where('code', 'EMP-001')->first()) {
            $count += $this->seedCheckInCorrection($employee, $actorAdmin);
        }

        if ($employee = Employee::where('code', 'EMP-002')->first()) {
            $count += $this->seedCheckOutCorrection($employee, $actorAdmin);
        }

        if ($employee = Employee::where('code', 'EMP-003')->first()) {
            $count += $this->seedStatusChange($employee, $actorAdmin);
        }

        if ($employee = Employee::where('code', 'EMP-004')->first()) {
            $count += $this->seedMissingAttendanceCreate($employee, $actorManager);
        }

        if ($employee = Employee::where('code', 'EMP-005')->first()) {
            $count += $this->seedDuplicateAttendanceDelete($employee, $actorAdmin);
        }

        $this->command->info("✓ AttendanceAuditLog seeded: {$count} entries anchored to real attendance records");
    }

    /**
     * Earliest a "workday" candidate is allowed to be, so that a narrated
     * correction/review a few days later never lands in the future.
     */
    private function latestEligibleWorkDate(): string
    {
        return now()->subDays(7)->toDateString();
    }

    /**
     * Recent WORKED attendances for an employee (excluding the last week, so
     * the narrated correction/review date always stays in the past), most
     * recent first — the pool scenarios pick a real row from so the
     * auditable_id always resolves.
     */
    private function recentWorkedAttendances(Employee $employee, int $limit = 15): Collection
    {
        return Attendance::query()
            ->where('employee_id', $employee->id)
            ->where('day_status', 'WORKED')
            ->where('date', '<=', $this->latestEligibleWorkDate())
            ->whereNotNull('check_in')
            ->orderByDesc('date')
            ->limit($limit)
            ->get();
    }

    /**
     * Scenario: Admin corrects a check-in time.
     * Uses a real WORKED attendance row — new_values mirrors the row's actual
     * current check_in (so it matches what the Attendance page shows), and
     * old_values synthesizes the "before correction" time.
     */
    private function seedCheckInCorrection(Employee $employee, User $actor): int
    {
        $pool = $this->recentWorkedAttendances($employee);

        if ($pool->isEmpty()) {
            return 0;
        }

        $attendance = $pool->get(min(3, $pool->count() - 1));

        $correctionDay = $attendance->check_in->copy()->addDay();
        $wrongCheckIn = $attendance->check_in->copy()->subMinutes(75);

        AttendanceAuditLog::create([
            'auditable_type' => Attendance::class,
            'auditable_id' => $attendance->id,
            'action' => AuditAction::UPDATE,
            'old_values' => [
                'check_in' => $wrongCheckIn->toDateTimeString(),
                'entry_late_seconds' => 0,
            ],
            'new_values' => [
                'check_in' => $attendance->check_in->toDateTimeString(),
                'entry_late_seconds' => $attendance->entry_late_seconds,
            ],
            'user_id' => $actor->id,
            'reason' => 'Corrección de hora de entrada — registro erróneo en terminal, confirmado con cámara.',
            'created_at' => $correctionDay->copy()->setTime(10, random_int(0, 59)),
        ]);

        return 1;
    }

    /**
     * Scenario: Admin corrects a missing check-out.
     * new_values mirrors the row's actual current check_out/net_worked_minutes.
     */
    private function seedCheckOutCorrection(Employee $employee, User $actor): int
    {
        $pool = $this->recentWorkedAttendances($employee)->filter(fn (Attendance $a) => $a->check_out !== null);
        $attendance = $pool->first();

        if (! $attendance) {
            return 0;
        }

        $correctionDay = $attendance->check_out->copy()->addDay();

        AttendanceAuditLog::create([
            'auditable_type' => Attendance::class,
            'auditable_id' => $attendance->id,
            'action' => AuditAction::UPDATE,
            'old_values' => [
                'check_out' => null,
                'net_worked_minutes' => null,
            ],
            'new_values' => [
                'check_out' => $attendance->check_out->toDateTimeString(),
                'net_worked_minutes' => $attendance->net_worked_minutes,
            ],
            'user_id' => $actor->id,
            'reason' => 'Empleado olvidó registrar salida. Horario capturado conforme a su turno programado.',
            'created_at' => $correctionDay->setTime(9, random_int(0, 30)),
        ]);

        return 1;
    }

    /**
     * Scenario: Admin changes day_status from ABSENCE to LEAVE.
     * Falls back to a WORKED day (narrated as "was marked ABSENCE by mistake")
     * if the employee has no real ABSENCE row in range.
     */
    private function seedStatusChange(Employee $employee, User $actor): int
    {
        $absence = Attendance::query()
            ->where('employee_id', $employee->id)
            ->where('day_status', 'ABSENCE')
            ->where('date', '<=', $this->latestEligibleWorkDate())
            ->orderByDesc('date')
            ->first();

        $attendance = $absence ?? $this->recentWorkedAttendances($employee)->last();

        if (! $attendance) {
            return 0;
        }

        $reviewDay = $attendance->date->copy()->addDays(random_int(2, 5));

        AttendanceAuditLog::create([
            'auditable_type' => Attendance::class,
            'auditable_id' => $attendance->id,
            'action' => AuditAction::UPDATE,
            'old_values' => ['day_status' => 'ABSENCE'],
            'new_values' => ['day_status' => 'LEAVE'],
            'user_id' => $actor->id,
            'reason' => 'Empleado presentó comprobante médico con fecha posterior. Estatus corregido a incapacidad.',
            'created_at' => $reviewDay->setTime(11, random_int(0, 59)),
        ]);

        return 1;
    }

    /**
     * Scenario: Manager registers an attendance that was missing (CREATE).
     * Picks a real DAY_OFF/rest-day row and narrates it as manually created
     * the following morning.
     */
    private function seedMissingAttendanceCreate(Employee $employee, User $actor): int
    {
        $attendance = Attendance::query()
            ->where('employee_id', $employee->id)
            ->where('day_status', 'DAY_OFF')
            ->where('date', '<=', $this->latestEligibleWorkDate())
            ->orderByDesc('date')
            ->first();

        if (! $attendance) {
            return 0;
        }

        $registeredDay = $attendance->date->copy()->addDay();

        AttendanceAuditLog::create([
            'auditable_type' => Attendance::class,
            'auditable_id' => $attendance->id,
            'action' => AuditAction::CREATE,
            'old_values' => null,
            'new_values' => [
                'employee_id' => $employee->id,
                'date' => $attendance->date->toDateString(),
                'day_status' => 'DAY_OFF',
                'check_in' => null,
                'check_out' => null,
            ],
            'user_id' => $actor->id,
            'reason' => 'Registro creado manualmente — día de descanso no capturado en su momento.',
            'created_at' => $registeredDay->setTime(8, random_int(0, 30)),
        ]);

        return 1;
    }

    /**
     * Scenario: Admin deletes a duplicate attendance entry.
     * auditable_id is a synthetic id past the current max (guaranteed not to
     * collide with the employee_id+date unique constraint, and to resolve to
     * no row) — matching what a real DELETE looks like once the row is gone.
     */
    private function seedDuplicateAttendanceDelete(Employee $employee, User $actor): int
    {
        $workDay = now()->subDays(random_int(2, 8))->startOfDay();
        $deletedId = (Attendance::max('id') ?? 0) + 1000 + $employee->id;

        AttendanceAuditLog::create([
            'auditable_type' => Attendance::class,
            'auditable_id' => $deletedId,
            'action' => AuditAction::DELETE,
            'old_values' => [
                'employee_id' => $employee->id,
                'date' => $workDay->toDateString(),
                'check_in' => $workDay->copy()->setTime(8, 2)->toDateTimeString(),
                'day_status' => 'WORKED',
            ],
            'new_values' => null,
            'user_id' => $actor->id,
            'reason' => 'Registro duplicado eliminado — fallo en terminal causó doble entrada para la misma fecha.',
            'created_at' => $workDay->copy()->addDay()->setTime(14, random_int(0, 59)),
        ]);

        return 1;
    }
}
