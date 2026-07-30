<?php

namespace Database\Seeders\Testing;

use App\Models\Branch;
use App\Models\CashAdjustment;
use App\Models\CashAdjustmentLine;
use App\Models\CashRegister;
use App\Models\CashSession;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Seeds one open cash session with a posted income and a posted expense,
 * split across two tender types, so the session detail page (#318) has a
 * non-trivial per-tender breakdown to render.
 *
 * Requires CoreTestSeeder to already have run (branch MAIN, superadmin user).
 */
class CashSessionDetailSeeder extends Seeder
{
    public function run(): void
    {
        $branch = Branch::where('code', 'MAIN')->firstOrFail();
        $superAdmin = User::where('email', 'superadmin@sushigo.com')->firstOrFail();

        $register = CashRegister::create([
            'branch_id' => $branch->id,
            'code' => 'REG-E2E-01',
            'name' => 'Caja E2E',
            'type' => CashRegister::TYPE_ON_PREMISE,
            'is_active' => true,
        ]);

        $session = CashSession::create([
            'cash_register_id' => $register->id,
            'operating_date' => now()->toDateString(),
            'status' => CashSession::STATUS_DRAFT,
            'opening_balance' => 500.00,
            'closing_balance' => 500.00,
            'meta' => [],
        ]);

        $income = CashAdjustment::create([
            'cash_session_id' => $session->id,
            'type' => CashAdjustment::TYPE_CORRECTION,
            'direction' => CashAdjustment::DIRECTION_INFLOW,
            'notes' => 'Venta de mostrador',
            'posted_by' => $superAdmin->id,
            'posted_at' => now(),
        ]);
        $income->lines()->create([
            'tender_type' => CashAdjustmentLine::TENDER_CASH,
            'amount' => 300.00,
            'currency' => 'MXN',
        ]);
        $income->lines()->create([
            'tender_type' => CashAdjustmentLine::TENDER_CARD,
            'amount' => 150.00,
            'currency' => 'MXN',
        ]);

        $expense = CashAdjustment::create([
            'cash_session_id' => $session->id,
            'type' => CashAdjustment::TYPE_CORRECTION,
            'direction' => CashAdjustment::DIRECTION_OUTFLOW,
            'notes' => 'Compra de insumos',
            'posted_by' => $superAdmin->id,
            'posted_at' => now(),
        ]);
        $expense->lines()->create([
            'tender_type' => CashAdjustmentLine::TENDER_CASH,
            'amount' => 50.00,
            'currency' => 'MXN',
        ]);
    }
}
