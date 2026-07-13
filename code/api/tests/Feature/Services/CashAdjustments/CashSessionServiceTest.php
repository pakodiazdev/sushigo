<?php

namespace Tests\Feature\Services\CashAdjustments;

use App\Models\Branch;
use App\Models\CashAdjustment;
use App\Models\CashAdjustmentLine;
use App\Models\CashExpense;
use App\Models\CashRegister;
use App\Models\CashSession;
use App\Services\CashAdjustments\CashSessionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CashSessionServiceTest extends TestCase
{
    use RefreshDatabase;

    private CashSessionService $service;

    private CashRegister $cashRegister;

    private Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new CashSessionService;

        // Create test branch and register
        $this->branch = Branch::factory()->create();
        $this->cashRegister = CashRegister::factory()->create([
            'branch_id' => $this->branch->id,
            'code' => 'REG-001',
            'type' => CashRegister::TYPE_ON_PREMISE,
        ]);
    }

    public function test_can_open_new_session_with_opening_balance(): void
    {
        $date = '2025-11-30';
        $openingBalance = 1000.00;

        $session = $this->service->openSession($this->cashRegister, $date, $openingBalance);

        $this->assertInstanceOf(CashSession::class, $session);
        $this->assertEquals($this->cashRegister->id, $session->cash_register_id);
        $this->assertEquals($date, $session->operating_date->format('Y-m-d'));
        $this->assertEquals(CashSession::STATUS_DRAFT, $session->status);
        $this->assertEquals($openingBalance, $session->opening_balance);
        $this->assertEquals($openingBalance, $session->closing_balance);
    }

    public function test_can_open_session_without_opening_balance_uses_previous_closing(): void
    {
        // Create previous session
        $previousSession = CashSession::factory()->create([
            'cash_register_id' => $this->cashRegister->id,
            'operating_date' => '2025-11-29',
            'status' => CashSession::STATUS_POSTED,
            'opening_balance' => 500.00,
            'closing_balance' => 1250.50,
        ]);

        $session = $this->service->openSession($this->cashRegister, '2025-11-30');

        $this->assertEquals(1250.50, $session->opening_balance);
    }

    public function test_cannot_open_duplicate_session_for_same_date(): void
    {
        $date = '2025-11-30';

        $this->service->openSession($this->cashRegister, $date, 1000.00);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Session already exists');

        $this->service->openSession($this->cashRegister, $date, 1000.00);
    }

    public function test_calculate_closing_balance_with_adjustments_and_expenses(): void
    {
        $session = CashSession::factory()->create([
            'cash_register_id' => $this->cashRegister->id,
            'opening_balance' => 1000.00,
            'status' => CashSession::STATUS_DRAFT,
        ]);

        // Create posted inflow adjustment
        $inflowAdj = CashAdjustment::factory()->posted()->create([
            'cash_session_id' => $session->id,
            'direction' => CashAdjustment::DIRECTION_INFLOW,
        ]);
        CashAdjustmentLine::factory()->create([
            'cash_adjustment_id' => $inflowAdj->id,
            'amount' => 500.00,
        ]);

        // Create posted outflow adjustment
        $outflowAdj = CashAdjustment::factory()->posted()->create([
            'cash_session_id' => $session->id,
            'direction' => CashAdjustment::DIRECTION_OUTFLOW,
        ]);
        CashAdjustmentLine::factory()->create([
            'cash_adjustment_id' => $outflowAdj->id,
            'amount' => 200.00,
        ]);

        // Create posted expense
        CashExpense::factory()->posted()->create([
            'cash_session_id' => $session->id,
            'amount' => 150.00,
        ]);

        $closingBalance = $this->service->calculateClosingBalance($session);

        // 1000 + 500 - 200 - 150 = 1150
        $this->assertEquals(1150.00, $closingBalance);
    }

    public function test_post_session_updates_status_and_closing_balance(): void
    {
        $session = CashSession::factory()->create([
            'cash_register_id' => $this->cashRegister->id,
            'opening_balance' => 1000.00,
            'closing_balance' => 1000.00,
            'status' => CashSession::STATUS_DRAFT,
        ]);

        // Add some posted adjustments
        $adj = CashAdjustment::factory()->posted()->create([
            'cash_session_id' => $session->id,
            'direction' => CashAdjustment::DIRECTION_INFLOW,
        ]);
        CashAdjustmentLine::factory()->create([
            'cash_adjustment_id' => $adj->id,
            'amount' => 300.00,
        ]);

        $postedSession = $this->service->postSession($session);

        $this->assertEquals(CashSession::STATUS_POSTED, $postedSession->status);
        $this->assertEquals(1300.00, $postedSession->closing_balance);
    }

    public function test_cannot_post_already_posted_session(): void
    {
        $session = CashSession::factory()->create([
            'cash_register_id' => $this->cashRegister->id,
            'status' => CashSession::STATUS_POSTED,
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('already posted');

        $this->service->postSession($session);
    }

    public function test_get_session_summary_returns_complete_data(): void
    {
        $session = CashSession::factory()->create([
            'cash_register_id' => $this->cashRegister->id,
            'opening_balance' => 1000.00,
            'closing_balance' => 1000.00,
        ]);

        // Create inflow adjustment with multiple tender types
        $adj = CashAdjustment::factory()->create([
            'cash_session_id' => $session->id,
            'direction' => CashAdjustment::DIRECTION_INFLOW,
        ]);
        CashAdjustmentLine::factory()->create([
            'cash_adjustment_id' => $adj->id,
            'tender_type' => 'CASH',
            'amount' => 200.00,
        ]);
        CashAdjustmentLine::factory()->create([
            'cash_adjustment_id' => $adj->id,
            'tender_type' => 'CARD',
            'amount' => 150.00,
        ]);

        // Create cash expense (tender type fixed for deterministic assertions)
        CashExpense::factory()->cash()->create([
            'cash_session_id' => $session->id,
            'category' => 'SUPPLIES',
            'amount' => 100.00,
        ]);

        $summary = $this->service->getSessionSummary($session);

        $this->assertArrayHasKey('incomes', $summary);
        $this->assertArrayHasKey('expenses', $summary);
        $this->assertArrayHasKey('total_incomes', $summary);
        $this->assertArrayHasKey('total_expenses', $summary);

        $this->assertEquals('350.00', $summary['total_incomes']);
        $this->assertEquals('100.00', $summary['total_expenses']);

        // Check incomes breakdown by tender type
        $incomesByType = collect($summary['incomes'])->keyBy('tender_type');
        $this->assertEquals(200.00, $incomesByType['CASH']['amount']);
        $this->assertEquals(150.00, $incomesByType['CARD']['amount']);
    }

    public function test_update_closing_balance_recalculates_and_saves(): void
    {
        $session = CashSession::factory()->create([
            'cash_register_id' => $this->cashRegister->id,
            'opening_balance' => 1000.00,
            'closing_balance' => 1000.00,
        ]);

        // Add posted adjustment
        $adj = CashAdjustment::factory()->posted()->create([
            'cash_session_id' => $session->id,
            'direction' => CashAdjustment::DIRECTION_INFLOW,
        ]);
        CashAdjustmentLine::factory()->create([
            'cash_adjustment_id' => $adj->id,
            'amount' => 250.00,
        ]);

        $updatedSession = $this->service->updateClosingBalance($session);

        $this->assertEquals(1250.00, $updatedSession->closing_balance);

        // Verify it was saved to database
        $this->assertDatabaseHas('cash_sessions', [
            'id' => $session->id,
            'closing_balance' => 1250.00,
        ]);
    }
}
