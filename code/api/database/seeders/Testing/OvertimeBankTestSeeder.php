<?php

namespace Database\Seeders\Testing;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Overtime bank test seeder — deterministic data for the Overtime Bank Cypress spec.
 *
 * Requires AttendanceTestSeeder to have run first (creates EMP-001 with schedule).
 * Gives EMP-001 one authorized-overtime attendance, mirroring the real checkout
 * (EARNED) + payroll close (PAID) flow so the balance and movement history render.
 */
class OvertimeBankTestSeeder extends Seeder
{
    private const DATE = '2026-06-24';

    private const OVERTIME_MINUTES = 90;

    private const HOURLY_RATE_APPLIED = 90.00;

    public function run(): void
    {
        $now = now();

        $employeeId = DB::table('employees')->where('code', 'EMP-001')->value('id');
        $managerId = DB::table('users')->where('email', 'admin@sushigo.com')->value('id');

        $attendanceId = DB::table('attendances')->insertGetId([
            'public_id' => Str::ulid()->toString(),
            'employee_id' => $employeeId,
            'date' => self::DATE,
            'check_in' => self::DATE.' 13:00:00',
            'check_out' => self::DATE.' 23:30:00',
            'lunch_start' => self::DATE.' 18:00:00',
            'lunch_end' => self::DATE.' 18:30:00',
            'entry_late_seconds' => 0,
            'lunch_late_seconds' => 0,
            'net_worked_minutes' => 570,
            'overtime_minutes' => self::OVERTIME_MINUTES,
            'overtime_authorized' => true,
            'overtime_authorized_by' => $managerId,
            'overtime_authorized_at' => self::DATE.' 23:35:00',
            'overtime_valuation_method' => 'AGREED_RATE',
            'overtime_rate_applied' => self::HOURLY_RATE_APPLIED,
            'overtime_amount' => round(self::OVERTIME_MINUTES / 60 * self::HOURLY_RATE_APPLIED, 2),
            'day_status' => 'WORKED',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('overtime_bank_movements')->insert([
            [
                'public_id' => Str::ulid()->toString(),
                'employee_id' => $employeeId,
                'attendance_id' => $attendanceId,
                'date' => self::DATE,
                'movement_type' => 'EARNED',
                'origin' => 'AUTO',
                'minutes' => self::OVERTIME_MINUTES,
                'valuation_method' => null,
                'applied_rate' => null,
                'amount' => null,
                'authorized_by' => null,
                'authorized_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'public_id' => Str::ulid()->toString(),
                'employee_id' => $employeeId,
                'attendance_id' => $attendanceId,
                'date' => self::DATE,
                'movement_type' => 'PAID',
                'origin' => 'AUTO',
                'minutes' => self::OVERTIME_MINUTES,
                'valuation_method' => 'AGREED_RATE',
                'applied_rate' => self::HOURLY_RATE_APPLIED,
                'amount' => round(self::OVERTIME_MINUTES / 60 * self::HOURLY_RATE_APPLIED, 2),
                'authorized_by' => $managerId,
                'authorized_at' => self::DATE.' 23:35:00',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }
}
