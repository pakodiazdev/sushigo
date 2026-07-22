<?php

namespace Tests\Unit\Services;

use App\Exceptions\CashAdjustmentAlreadyPostedException;
use App\Exceptions\InvalidCashAdjustmentLineException;
use App\Models\Branch;
use App\Models\CashAdjustment;
use App\Models\CashAdjustmentLine;
use App\Models\CashRegister;
use App\Models\CashSession;
use App\Models\User;
use App\Services\CashAdjustments\CashAdjustmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CashAdjustmentServiceTest extends TestCase
{
    use RefreshDatabase;

    private CashAdjustmentService $service;

    private CashSession $session;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new CashAdjustmentService;

        $branch = Branch::factory()->create();
        $register = CashRegister::factory()->for($branch)->create();
        $this->session = CashSession::factory()
            ->for($register, 'cashRegister')
            ->draft()
            ->create();

        $this->user = User::factory()->create();
    }

    #[Test]
    public function it_can_create_adjustment_with_lines()
    {
        $lines = [
            [
                'tender_type' => 'CASH',
                'amount' => 100.00,
            ],
            [
                'tender_type' => 'CASH',
                'amount' => 50.00,
            ],
        ];

        $adjustment = $this->service->createAdjustment(
            session: $this->session,
            type: 'EXTERNAL_IMPORT',
            direction: 'INFLOW',
            lines: $lines,
            sourceSystem: 'TEST_SYSTEM',
            notes: 'Test adjustment'
        );

        $this->assertInstanceOf(CashAdjustment::class, $adjustment);
        $this->assertEquals('INFLOW', $adjustment->direction);
        $this->assertEquals('EXTERNAL_IMPORT', $adjustment->type);
        $this->assertCount(2, $adjustment->lines);
        $this->assertEquals(150.00, $adjustment->getTotalAmount());
    }

    #[Test]
    public function it_can_create_from_external_report()
    {
        $lines = [
            [
                'tender_type' => 'CASH',
                'amount' => 500.00,
                'reference' => 'EXT-001',
            ],
        ];

        $adjustment = $this->service->createFromExternalReport(
            session: $this->session,
            sourceSystem: 'UBER_EATS',
            lines: $lines,
            notes: 'Daily report import'
        );

        $this->assertEquals('EXTERNAL_IMPORT', $adjustment->type);
        $this->assertEquals('UBER_EATS', $adjustment->source_system);
        $this->assertEquals(500.00, $adjustment->lines->sum('amount'));
    }

    #[Test]
    public function it_can_create_correction_adjustment()
    {
        $lines = [
            [
                'tender_type' => 'CASH',
                'amount' => 50.00,
            ],
        ];

        $adjustment = $this->service->createCorrection(
            session: $this->session,
            direction: 'OUTFLOW',
            lines: $lines,
            notes: 'Cash count discrepancy - shortage'
        );

        $this->assertEquals('CORRECTION', $adjustment->type);
        $this->assertEquals('OUTFLOW', $adjustment->direction);
        $this->assertEquals(50.00, $adjustment->lines->sum('amount'));
    }

    #[Test]
    public function it_can_post_adjustment()
    {
        $adjustment = CashAdjustment::factory()
            ->for($this->session)
            ->draft()
            ->create();

        CashAdjustmentLine::factory()
            ->for($adjustment)
            ->cash()
            ->withAmount(100.00)
            ->create();

        $posted = $this->service->postAdjustment($adjustment, $this->user);

        $this->assertTrue($posted->isPosted());
        $this->assertNotNull($posted->posted_at);
    }

    #[Test]
    public function it_cannot_post_already_posted_adjustment()
    {
        $adjustment = CashAdjustment::factory()
            ->for($this->session)
            ->posted()
            ->create();

        $this->expectException(CashAdjustmentAlreadyPostedException::class);
        $this->expectExceptionMessage('already posted');

        $this->service->postAdjustment($adjustment, $this->user);
    }

    #[Test]
    public function it_can_delete_draft_adjustment()
    {
        $adjustment = CashAdjustment::factory()
            ->for($this->session)
            ->draft()
            ->create();

        $adjustmentId = $adjustment->id;
        $result = $this->service->deleteAdjustment($adjustment);

        $this->assertTrue($result);
        $this->assertDatabaseMissing('cash_adjustments', ['id' => $adjustmentId]);
    }

    #[Test]
    public function it_cannot_delete_posted_adjustment()
    {
        $adjustment = CashAdjustment::factory()
            ->for($this->session)
            ->posted()
            ->create();

        $this->expectException(CashAdjustmentAlreadyPostedException::class);
        $this->expectExceptionMessage('posted');

        $this->service->deleteAdjustment($adjustment);
    }

    #[Test]
    public function it_can_get_adjustment_summary()
    {
        // Create an adjustment with multiple lines
        $adjustment = CashAdjustment::factory()
            ->for($this->session)
            ->posted()
            ->inflow()
            ->has(CashAdjustmentLine::factory()->cash()->withAmount(100.00), 'lines')
            ->has(CashAdjustmentLine::factory()->card()->withAmount(50.00), 'lines')
            ->create();

        $summary = $this->service->getAdjustmentSummary($adjustment);

        $this->assertArrayHasKey('adjustment_id', $summary);
        $this->assertArrayHasKey('type', $summary);
        $this->assertArrayHasKey('direction', $summary);
        $this->assertArrayHasKey('total_amount', $summary);
        $this->assertArrayHasKey('lines_count', $summary);
        $this->assertEquals(2, $summary['lines_count']);
        $this->assertEquals(150.00, $summary['total_amount']);
    }

    #[Test]
    public function it_validates_tender_type_requirements()
    {
        $this->expectException(InvalidCashAdjustmentLineException::class);

        // This should fail because CARD requires card_terminal_id
        $lines = [
            [
                'tender_type' => 'CARD',
                'amount' => 100.00,
                // Missing card_terminal_id
            ],
        ];

        $this->service->createAdjustment(
            session: $this->session,
            type: 'EXTERNAL_IMPORT',
            direction: 'INFLOW',
            lines: $lines
        );
    }

    #[Test]
    public function it_cannot_create_adjustment_without_lines()
    {
        $this->expectException(InvalidCashAdjustmentLineException::class);
        $this->expectExceptionMessage('Adjustment must have at least one line');

        $this->service->createAdjustment(
            session: $this->session,
            type: 'EXTERNAL_IMPORT',
            direction: 'INFLOW',
            lines: []
        );
    }

    #[Test]
    public function it_validates_line_has_tender_type()
    {
        $this->expectException(InvalidCashAdjustmentLineException::class);
        $this->expectExceptionMessage('Line must have tender_type');

        $this->service->createAdjustment(
            session: $this->session,
            type: 'EXTERNAL_IMPORT',
            direction: 'INFLOW',
            lines: [
                ['amount' => 100.00],
            ]
        );
    }

    #[Test]
    public function it_validates_line_has_positive_amount()
    {
        $this->expectException(InvalidCashAdjustmentLineException::class);
        $this->expectExceptionMessage('Line must have positive amount');

        $this->service->createAdjustment(
            session: $this->session,
            type: 'EXTERNAL_IMPORT',
            direction: 'INFLOW',
            lines: [
                ['tender_type' => 'CASH', 'amount' => 0],
            ]
        );
    }

    #[Test]
    public function it_validates_transfer_tender_requires_bank_account()
    {
        $this->expectException(InvalidCashAdjustmentLineException::class);
        $this->expectExceptionMessage('TRANSFER tender requires bank_account_id');

        $this->service->createAdjustment(
            session: $this->session,
            type: 'EXTERNAL_IMPORT',
            direction: 'INFLOW',
            lines: [
                ['tender_type' => 'TRANSFER', 'amount' => 100.00],
            ]
        );
    }

    #[Test]
    public function it_calculates_total_amount_with_multiple_lines()
    {
        $adjustment = CashAdjustment::factory()
            ->for($this->session)
            ->draft()
            ->create();

        CashAdjustmentLine::factory()->for($adjustment)->cash()->withAmount(100.00)->create();
        CashAdjustmentLine::factory()->for($adjustment)->card()->withAmount(50.00)->create();
        CashAdjustmentLine::factory()->for($adjustment)->transfer()->withAmount(75.00)->create();

        $adjustment->refresh();

        $this->assertEquals(225.00, $adjustment->getTotalAmount());
    }
}
