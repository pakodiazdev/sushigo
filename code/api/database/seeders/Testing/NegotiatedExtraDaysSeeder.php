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
    private int $employeeId;

    private int $branchId;

    private int $adminUserId;

    private string $now;

    public function run(): void
    {
        $this->now = (string) now();
        $this->employeeId = (int) DB::table('employees')->where('code', 'EMP-001')->value('id');
        $this->branchId = (int) DB::table('branches')->where('code', 'MAIN')->value('id');
        $this->adminUserId = (int) DB::table('users')->where('email', 'admin@sushigo.com')->value('id');

        DB::table('negotiated_extra_days')->insert([
            $this->row('2026-03-15', '600.0000', '100.0000', '600.0000', 'Turno especial'),
            $this->row('2026-04-05', '500.0000', '50.0000', '250.0000', null),
            $this->row('2026-04-20', '700.0000', '0.0000', '0.0000', 'Sin prima'),
            $this->row('2026-05-10', '800.0000', '100.0000', '800.0000', 'Próximo extra'),
        ]);
    }

    /** Build a single negotiated_extra_days row with shared fields pre-filled. */
    private function row(
        string $date,
        string $wage,
        string $primaPercent,
        string $primaAmount,
        ?string $notes,
    ): array {
        return [
            'public_id' => (string) Str::ulid(),
            'employee_id' => $this->employeeId,
            'request_id' => null,
            'branch_id' => $this->branchId,
            'date' => $date,
            'agreed_daily_wage' => $wage,
            'prima_percent' => $primaPercent,
            'prima_amount' => $primaAmount,
            'approved_by' => $this->adminUserId,
            'status' => 'APPROVED',
            'notes' => $notes,
            'created_at' => $this->now,
            'updated_at' => $this->now,
            'deleted_at' => null,
        ];
    }
}
