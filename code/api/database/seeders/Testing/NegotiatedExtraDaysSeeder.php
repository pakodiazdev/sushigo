<?php

namespace Database\Seeders\Testing;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Negotiated extra days seeder — 4 records for EMP-001.
 *
 * Used by the employee-negotiated-extra-days Cypress spec via:
 *   cy.task('test:reset', 'attendance-extra-days')
 *
 * Employees must already exist (AttendanceTestSeeder ran first).
 *
 * Records:
 *   2026-03-15  $600  prima 100%  → $600  notes: "Turno especial"   (past)
 *   2026-04-05  $500  prima 50%   → $250  notes: null                (past)
 *   2026-04-20  $700  prima 0%    → $0    notes: "Sin prima"         (past)
 *   2026-05-10  $800  prima 100%  → $800  notes: "Próximo extra"     (future — cancellable)
 */
class NegotiatedExtraDaysSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $employee = DB::table('employees')->where('code', 'EMP-001')->first();
        $branchId = DB::table('branches')->where('code', 'MAIN')->value('id');
        $adminUserId = DB::table('users')->where('email', 'admin@sushigo.com')->value('id');

        DB::table('negotiated_extra_days')->insert([
            [
                'public_id' => (string) Str::ulid(),
                'employee_id' => $employee->id,
                'request_id' => null,
                'branch_id' => $branchId,
                'date' => '2026-03-15',
                'agreed_daily_wage' => '600.0000',
                'prima_percent' => '100.0000',
                'prima_amount' => '600.0000',
                'approved_by' => $adminUserId,
                'status' => 'APPROVED',
                'notes' => 'Turno especial',
                'created_at' => $now,
                'updated_at' => $now,
                'deleted_at' => null,
            ],
            [
                'public_id' => (string) Str::ulid(),
                'employee_id' => $employee->id,
                'request_id' => null,
                'branch_id' => $branchId,
                'date' => '2026-04-05',
                'agreed_daily_wage' => '500.0000',
                'prima_percent' => '50.0000',
                'prima_amount' => '250.0000',
                'approved_by' => $adminUserId,
                'status' => 'APPROVED',
                'notes' => null,
                'created_at' => $now,
                'updated_at' => $now,
                'deleted_at' => null,
            ],
            [
                'public_id' => (string) Str::ulid(),
                'employee_id' => $employee->id,
                'request_id' => null,
                'branch_id' => $branchId,
                'date' => '2026-04-20',
                'agreed_daily_wage' => '700.0000',
                'prima_percent' => '0.0000',
                'prima_amount' => '0.0000',
                'approved_by' => $adminUserId,
                'status' => 'APPROVED',
                'notes' => 'Sin prima',
                'created_at' => $now,
                'updated_at' => $now,
                'deleted_at' => null,
            ],
            [
                'public_id' => (string) Str::ulid(),
                'employee_id' => $employee->id,
                'request_id' => null,
                'branch_id' => $branchId,
                'date' => '2026-05-10',
                'agreed_daily_wage' => '800.0000',
                'prima_percent' => '100.0000',
                'prima_amount' => '800.0000',
                'approved_by' => $adminUserId,
                'status' => 'APPROVED',
                'notes' => 'Próximo extra',
                'created_at' => $now,
                'updated_at' => $now,
                'deleted_at' => null,
            ],
        ]);
    }
}
