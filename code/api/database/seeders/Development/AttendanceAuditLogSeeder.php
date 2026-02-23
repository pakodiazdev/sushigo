<?php

namespace Database\Seeders\Development;

use App\Enums\AuditAction;
use App\Models\AttendanceAuditLog;
use App\Models\Employee;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\Base\RepeatableSeeder;

/**
 * Seeds realistic AttendanceAuditLog entries for development.
 *
 * Simulates the audit trail that would be generated once the Auditable trait
 * (AP-065) is implemented. Each scenario represents a real-world edit case:
 *
 *   - Admin corrects a check-in time from a previous day (RF-18)
 *   - Admin corrects a check-out after the employee forgot to clock out (RF-18)
 *   - Admin changes a day status from ABSENCE to LEAVE after documentation (RF-18)
 *   - Manager registers an attendance that was missing (CREATE audit)
 *   - Admin soft-deletes a duplicate attendance entry (DELETE audit)
 *
 * Uses RepeatableSeeder so it can be re-run in development to refresh demo data.
 */
class AttendanceAuditLogSeeder extends RepeatableSeeder
{
    public function run(): void
    {
        // Requires employees and an admin user to exist
        $admin = User::whereHas('roles', fn ($q) => $q->where('name', 'admin'))->first();
        $superAdmin = User::whereHas('roles', fn ($q) => $q->where('name', 'super-admin'))->first();
        $manager = User::whereHas('roles', fn ($q) => $q->where('name', 'manager'))->first();

        if (! $admin && ! $superAdmin) {
            $this->command->warn('⚠️  No admin/super-admin user found. Skipping AttendanceAuditLogSeeder.');
            return;
        }

        $actorAdmin    = $admin ?? $superAdmin;
        $actorManager  = $manager ?? $actorAdmin;

        $employees = Employee::where('is_active', true)->take(5)->get();

        if ($employees->isEmpty()) {
            $this->command->warn('⚠️  No active employees found. Skipping AttendanceAuditLogSeeder.');
            return;
        }

        $count = 0;

        foreach ($employees as $employee) {
            // Fake attendance IDs — once Attendance model exists these will be real FKs.
            // The auditable_id here represents what the id would be in attendances table.
            $fakeAttendanceId = $employee->id * 100 + rand(1, 99);

            $count += $this->seedCheckInCorrection($employee, $fakeAttendanceId, $actorAdmin);
            $count += $this->seedCheckOutCorrection($employee, $fakeAttendanceId + 1, $actorAdmin);
            $count += $this->seedStatusChange($employee, $fakeAttendanceId + 2, $actorAdmin);
        }

        // Scenario: Manager registers a missing attendance (CREATE)
        $firstEmployee = $employees->first();
        $count += $this->seedMissingAttendanceCreate($firstEmployee, $actorManager);

        // Scenario: Admin removes a duplicate entry (DELETE)
        $lastEmployee = $employees->last();
        $count += $this->seedDuplicateAttendanceDelete($lastEmployee, $actorAdmin);

        $this->command->info("✓ AttendanceAuditLog seeded: {$count} entries across {$employees->count()} employees");
    }

    /**
     * Scenario: Admin corrects a check-in time.
     * Employee arrived at 09:15 but check-in was recorded as 08:00 (typo).
     * Admin fixes it the next day, providing justification.
     */
    private function seedCheckInCorrection(Employee $employee, int $attendanceId, User $actor): int
    {
        $workDay = now()->subDays(rand(3, 14))->startOfDay();
        $correctionDay = $workDay->copy()->addDay();

        AttendanceAuditLog::create([
            'auditable_type' => 'App\\Models\\Attendance',
            'auditable_id'   => $attendanceId,
            'action'         => AuditAction::UPDATE,
            'old_values'     => [
                'check_in'           => $workDay->copy()->setTime(8, 0)->toDateTimeString(),
                'entry_late_seconds' => 0,
            ],
            'new_values'     => [
                'check_in'           => $workDay->copy()->setTime(9, 15)->toDateTimeString(),
                'entry_late_seconds' => 4500, // 75 min late
            ],
            'user_id'        => $actor->id,
            'reason'         => 'Corrección de hora de entrada — registro erróneo en terminal, confirmado con cámara.',
            'created_at'     => $correctionDay->copy()->setTime(10, rand(0, 59)),
        ]);

        return 1;
    }

    /**
     * Scenario: Admin corrects a missing check-out.
     * Employee forgot to clock out; manager registered the expected end time
     * manually the following morning. net_worked_minutes recalculated.
     */
    private function seedCheckOutCorrection(Employee $employee, int $attendanceId, User $actor): int
    {
        $workDay = now()->subDays(rand(3, 10))->startOfDay();

        AttendanceAuditLog::create([
            'auditable_type' => 'App\\Models\\Attendance',
            'auditable_id'   => $attendanceId,
            'action'         => AuditAction::UPDATE,
            'old_values'     => [
                'check_out'         => null,
                'net_worked_minutes' => null,
                'overtime_minutes'   => 0,
            ],
            'new_values'     => [
                'check_out'          => $workDay->copy()->setTime(18, 0)->toDateTimeString(),
                'net_worked_minutes' => 480, // 8 hrs
                'overtime_minutes'   => 0,
            ],
            'user_id'        => $actor->id,
            'reason'         => 'Empleado olvidó registrar salida. Horario capturado conforme a su turno programado.',
            'created_at'     => $workDay->copy()->addDay()->setTime(9, rand(0, 30)),
        ]);

        return 1;
    }

    /**
     * Scenario: Admin changes day_status from ABSENCE to LEAVE.
     * Employee presented medical documentation after the fact.
     * Admin updates the status and links the leave record.
     */
    private function seedStatusChange(Employee $employee, int $attendanceId, User $actor): int
    {
        $workDay = now()->subDays(rand(5, 20))->startOfDay();

        AttendanceAuditLog::create([
            'auditable_type' => 'App\\Models\\Attendance',
            'auditable_id'   => $attendanceId,
            'action'         => AuditAction::UPDATE,
            'old_values'     => [
                'day_status' => 'ABSENCE',
            ],
            'new_values'     => [
                'day_status' => 'LEAVE',
            ],
            'user_id'        => $actor->id,
            'reason'         => 'Empleado presentó comprobante médico con fecha posterior. Estatus corregido a incapacidad.',
            'created_at'     => $workDay->copy()->addDays(rand(2, 5))->setTime(11, rand(0, 59)),
        ]);

        return 1;
    }

    /**
     * Scenario: Manager registers an attendance that was missing (CREATE).
     * The system didn't have a record for this day; manager creates it manually
     * to mark the day as DAY_OFF.
     */
    private function seedMissingAttendanceCreate(Employee $employee, User $actor): int
    {
        $workDay = now()->subDays(rand(7, 21))->startOfDay();

        AttendanceAuditLog::create([
            'auditable_type' => 'App\\Models\\Attendance',
            'auditable_id'   => $employee->id * 100 + 50,
            'action'         => AuditAction::CREATE,
            'old_values'     => null,
            'new_values'     => [
                'employee_id' => $employee->id,
                'date'        => $workDay->toDateString(),
                'day_status'  => 'DAY_OFF',
                'check_in'    => null,
                'check_out'   => null,
            ],
            'user_id'        => $actor->id,
            'reason'         => 'Registro creado manualmente — día de descanso no capturado en su momento.',
            'created_at'     => $workDay->copy()->addDays(1)->setTime(8, rand(0, 30)),
        ]);

        return 1;
    }

    /**
     * Scenario: Admin deletes a duplicate attendance entry.
     * Two check-ins were registered for the same employee/date due to a terminal glitch.
     * Admin removes the incorrect duplicate.
     */
    private function seedDuplicateAttendanceDelete(Employee $employee, User $actor): int
    {
        $workDay = now()->subDays(rand(2, 8))->startOfDay();

        AttendanceAuditLog::create([
            'auditable_type' => 'App\\Models\\Attendance',
            'auditable_id'   => $employee->id * 100 + 77,
            'action'         => AuditAction::DELETE,
            'old_values'     => [
                'employee_id' => $employee->id,
                'date'        => $workDay->toDateString(),
                'check_in'    => $workDay->copy()->setTime(8, 2)->toDateTimeString(),
                'day_status'  => 'WORKED',
            ],
            'new_values'     => null,
            'user_id'        => $actor->id,
            'reason'         => 'Registro duplicado eliminado — fallo en terminal causó doble entrada para la misma fecha.',
            'created_at'     => $workDay->copy()->addDay()->setTime(14, rand(0, 59)),
        ]);

        return 1;
    }
}
