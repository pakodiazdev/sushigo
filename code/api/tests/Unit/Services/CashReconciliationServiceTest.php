<?php

namespace Tests\Unit\Services;

use App\Models\Branch;
use App\Models\CashAdjustment;
use App\Models\CashAdjustmentLine;
use App\Models\CashExpense;
use App\Models\CashRegister;
use App\Models\CashSession;
use App\Services\CashAdjustments\CashReconciliationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CashReconciliationServiceTest extends TestCase
{
    use RefreshDatabase;

    private CashReconciliationService $service;
    private CashSession $session;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new CashReconciliationService();

        $branch = Branch::factory()->create();
        $register = CashRegister::factory()->for($branch)->create();
        $this->session = CashSession::factory()
            ->for($register, 'cashRegister')
            ->posted()
            ->create([
                'opening_balance' => 1000.00,
                'closing_balance' => 1500.00,
            ]);
    }

    #[Test]
    public function it_can_calculate_session_variance()
    {
        // Add an inflow adjustment to make expected closing = opening + inflow = 1000 + 500 = 1500
        CashAdjustment::factory()
            ->for($this->session)
            ->posted()
            ->inflow()
            ->has(CashAdjustmentLine::factory()->cash()->withAmount(500.00), 'lines')
            ->create();

        // Now actualClosing (1450) - expectedClosing (1500) = -50
        $variance = $this->service->getVariance($this->session, 1450.00);

        $this->assertIsArray($variance);
        $this->assertArrayHasKey('variance', $variance);
        $this->assertEquals(-50.00, $variance['variance']);
    }

    #[Test]
    public function it_can_generate_daily_summary()
    {
        // Create adjustments
        CashAdjustment::factory()
            ->for($this->session)
            ->posted()
            ->inflow()
            ->has(CashAdjustmentLine::factory()->cash()->withAmount(200.00), 'lines')
            ->create();

        CashAdjustment::factory()
            ->for($this->session)
            ->posted()
            ->outflow()
            ->has(CashAdjustmentLine::factory()->cash()->withAmount(50.00), 'lines')
            ->create();

        // Create expenses
        CashExpense::factory()
            ->for($this->session)
            ->posted()
            ->cash()
            ->create(['amount' => 100.00]);

        $summary = $this->service->generateDailySummary($this->session);

        $this->assertArrayHasKey('session', $summary);
        $this->assertArrayHasKey('adjustments', $summary);
        $this->assertArrayHasKey('expenses', $summary);
        $this->assertArrayHasKey('reconciliation', $summary);
        $this->assertArrayHasKey('variance', $summary['reconciliation']);
    }

    #[Test]
    public function it_can_generate_period_summary()
    {
        // Create additional sessions for the same register but different dates
        $session2 = CashSession::factory()
            ->for($this->session->cashRegister, 'cashRegister')
            ->posted()
            ->create([
                'operating_date' => now()->subDay(),
                'opening_balance' => 500.00,
                'closing_balance' => 800.00
            ]);

        $sessions = collect([$this->session, $session2]);

        $summary = $this->service->generatePeriodSummary($sessions);

        $this->assertArrayHasKey('sessions_count', $summary);
        $this->assertEquals(2, $summary['sessions_count']);
        $this->assertArrayHasKey('totals', $summary);
        $this->assertArrayHasKey('reconciliation', $summary);
        $this->assertArrayHasKey('inflow_adjustments', $summary['totals']);
        $this->assertArrayHasKey('expenses', $summary['totals']);
    }

    #[Test]
    public function it_can_get_reconciliation_report()
    {
        CashAdjustment::factory()
            ->for($this->session)
            ->posted()
            ->inflow()
            ->has(CashAdjustmentLine::factory()->cash()->withAmount(100.00), 'lines')
            ->create();

        CashExpense::factory()
            ->for($this->session)
            ->posted()
            ->cash()
            ->create(['amount' => 50.00]);

        $report = $this->service->getReconciliationReport(
            cashRegister: $this->session->cashRegister,
            fromDate: now()->subDays(7)->format('Y-m-d'),
            toDate: now()->format('Y-m-d')
        );

        $this->assertArrayHasKey('cash_register', $report);
        $this->assertArrayHasKey('period_summary', $report);
        $this->assertArrayHasKey('daily_summaries', $report);
    }

    #[Test]
    public function it_generates_daily_summary_with_tender_breakdown()
    {
        CashAdjustmentLine::factory()
            ->for(CashAdjustment::factory()->for($this->session)->posted())
            ->cash()
            ->withAmount(100.00)
            ->create();

        CashAdjustmentLine::factory()
            ->for(CashAdjustment::factory()->for($this->session)->posted())
            ->card()
            ->withAmount(200.00)
            ->create();

        $summary = $this->service->generateDailySummary($this->session);

        $this->assertArrayHasKey('adjustments', $summary);
        $this->assertArrayHasKey('tender_breakdown', $summary['adjustments']);
    }

    #[Test]
    public function it_includes_variance_status_in_variance_calculation()
    {
        // Opening balance 1000, no adjustments, so expected = 1000
        // Variance with actual 990 = -10 (abs = 10, status = CRITICAL)
        $variance = $this->service->getVariance($this->session, 990.00);

        $this->assertArrayHasKey('status', $variance);
        $this->assertEquals('CRITICAL', $variance['status']);

        // Variance with actual 1005 = 5 (abs = 5, status = WARNING)
        $variance2 = $this->service->getVariance($this->session, 1005.00);
        $this->assertEquals('WARNING', $variance2['status']);

        // Variance with actual 1000 = 0 (abs = 0, status = OK)
        $variance3 = $this->service->getVariance($this->session, 1000.00);
        $this->assertEquals('OK', $variance3['status']);
    }

    #[Test]
    public function it_handles_zero_variance_correctly()
    {
        $session = CashSession::factory()
            ->for($this->session->cashRegister, 'cashRegister')
            ->posted()
            ->create([
                'operating_date' => now()->subDay(), // Different date to avoid unique constraint
                'opening_balance' => 1000.00,
                'closing_balance' => 1000.00,
            ]);

        $varianceData = $this->service->getVariance($session, 1000.00);

        $this->assertEquals(0.00, $varianceData['variance']);
        $this->assertEquals('OK', $varianceData['status']);
    }

    #[Test]
    public function it_includes_all_posted_transactions_in_summary()
    {
        // Create draft adjustment (should not be included)
        CashAdjustment::factory()
            ->for($this->session)
            ->draft()
            ->has(CashAdjustmentLine::factory()->cash()->withAmount(500.00), 'lines')
            ->create();

        // Create posted adjustment (should be included)
        CashAdjustment::factory()
            ->for($this->session)
            ->posted()
            ->has(CashAdjustmentLine::factory()->cash()->withAmount(100.00), 'lines')
            ->create();

        // Create draft expense (should not be included)
        CashExpense::factory()
            ->for($this->session)
            ->draft()
            ->create(['amount' => 500.00]);

        // Create posted expense (should be included)
        CashExpense::factory()
            ->for($this->session)
            ->posted()
            ->create(['amount' => 50.00]);

        $summary = $this->service->generateDailySummary($this->session);

        // Should only include posted transactions
        // 1 posted adjustment (100.00)
        $this->assertEquals(1, $summary['adjustments']['inflow']['count'] + $summary['adjustments']['outflow']['count']);
        // 1 posted expense (50.00)
        $this->assertEquals(50.00, $summary['expenses']['total']);
    }

    #[Test]
    public function it_calculates_net_adjustments_correctly()
    {
        CashAdjustment::factory()
            ->for($this->session)
            ->posted()
            ->inflow()
            ->has(CashAdjustmentLine::factory()->cash()->withAmount(300.00), 'lines')
            ->create();

        CashAdjustment::factory()
            ->for($this->session)
            ->posted()
            ->outflow()
            ->has(CashAdjustmentLine::factory()->cash()->withAmount(100.00), 'lines')
            ->create();

        $summary = $this->service->generateDailySummary($this->session);

        // Net = inflow (300) - outflow (100) = 200
        $this->assertEquals(200.00, $summary['adjustments']['net']);
    }

    #[Test]
    public function it_groups_expenses_by_category_in_summary()
    {
        CashExpense::factory()
            ->for($this->session)
            ->posted()
            ->category('SUPPLIES')
            ->create(['amount' => 100.00]);

        CashExpense::factory()
            ->for($this->session)
            ->posted()
            ->category('SUPPLIES')
            ->create(['amount' => 50.00]);

        CashExpense::factory()
            ->for($this->session)
            ->posted()
            ->category('MAINTENANCE')
            ->create(['amount' => 200.00]);

        $summary = $this->service->generateDailySummary($this->session);

        $this->assertArrayHasKey('category_breakdown', $summary['expenses']);
        $breakdown = $summary['expenses']['category_breakdown'];

        $this->assertEquals(150.00, $breakdown['SUPPLIES']['total']);
        $this->assertEquals(2, $breakdown['SUPPLIES']['count']);
        $this->assertEquals(200.00, $breakdown['MAINTENANCE']['total']);
        $this->assertEquals(1, $breakdown['MAINTENANCE']['count']);
    }
}
