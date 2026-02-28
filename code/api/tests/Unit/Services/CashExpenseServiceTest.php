<?php

namespace Tests\Unit\Services;

use App\Models\BankAccount;
use App\Models\Branch;
use App\Models\CashExpense;
use App\Models\CashRegister;
use App\Models\CashSession;
use App\Models\CashTerminal;
use App\Models\User;
use App\Services\CashAdjustments\CashExpenseService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CashExpenseServiceTest extends TestCase
{
    use RefreshDatabase;

    private CashExpenseService $service;

    private CashSession $session;

    private Branch $branch;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new CashExpenseService;

        $this->branch = Branch::factory()->create();
        $register = CashRegister::factory()->for($this->branch)->create();
        $this->session = CashSession::factory()
            ->for($register, 'cashRegister')
            ->draft()
            ->create();

        $this->user = User::factory()->create();
    }

    #[Test]
    public function it_can_register_cash_expense()
    {
        $expense = $this->service->registerExpense(
            session: $this->session,
            tenderType: 'CASH',
            amount: 150.00,
            category: 'SUPPLIES',
            vendor: 'Office Depot',
            reference: 'REC-001',
            notes: 'Office supplies',
            cardTerminalId: null,
            bankAccountId: null,
            createdBy: $this->user,
            incurredAt: null,
            meta: []
        );

        $this->assertInstanceOf(CashExpense::class, $expense);
        $this->assertEquals('SUPPLIES', $expense->category);
        $this->assertEquals(150.00, $expense->amount);
        $this->assertEquals('CASH', $expense->tender_type);
        $this->assertFalse($expense->isPosted());
        $this->assertNull($expense->posted_at);
    }

    #[Test]
    public function it_can_register_card_expense_with_terminal()
    {
        $terminal = CashTerminal::factory()->for($this->branch)->create();

        $expense = $this->service->registerExpense(
            session: $this->session,
            tenderType: 'CARD',
            amount: 250.00,
            category: 'MAINTENANCE',
            vendor: 'Repair Co',
            reference: 'CARD-REF-001',
            notes: 'Equipment repair',
            cardTerminalId: $terminal->id,
            bankAccountId: null,
            createdBy: $this->user,
            incurredAt: null,
            meta: []
        );

        $this->assertEquals('CARD', $expense->tender_type);
        $this->assertEquals($terminal->id, $expense->card_terminal_id);
    }

    #[Test]
    public function it_can_register_transfer_expense_with_bank_account()
    {
        $bankAccount = BankAccount::factory()->for($this->branch)->create();

        $expense = $this->service->registerExpense(
            session: $this->session,
            tenderType: 'TRANSFER',
            amount: 1000.00,
            category: 'OTHER',
            vendor: 'Service Provider',
            reference: 'REC-003',
            notes: 'Service payment',
            cardTerminalId: null,
            bankAccountId: $bankAccount->id,
            createdBy: $this->user,
            incurredAt: null,
            meta: []
        );

        $this->assertEquals('TRANSFER', $expense->tender_type);
        $this->assertEquals($bankAccount->id, $expense->bank_account_id);
    }

    #[Test]
    public function it_can_post_expense()
    {
        $expense = CashExpense::factory()
            ->for($this->session)
            ->draft()
            ->cash()
            ->create();

        $posted = $this->service->postExpense($expense, $this->user);

        $this->assertTrue($posted->isPosted());
        $this->assertNotNull($posted->posted_at);
    }

    #[Test]
    public function it_cannot_post_already_posted_expense()
    {
        $expense = CashExpense::factory()
            ->for($this->session)
            ->posted()
            ->create();

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('already posted');

        $this->service->postExpense($expense, $this->user);
    }

    #[Test]
    public function it_can_update_draft_expense()
    {
        $expense = CashExpense::factory()
            ->for($this->session)
            ->draft()
            ->cash()
            ->create();

        $updateData = [
            'amount' => 200.00,
            'notes' => 'Updated notes',
            'category' => 'MAINTENANCE',
        ];

        $updated = $this->service->updateExpense($expense, $updateData);

        $this->assertEquals(200.00, $updated->amount);
        $this->assertEquals('Updated notes', $updated->notes);
        $this->assertEquals('MAINTENANCE', $updated->category);
    }

    #[Test]
    public function it_cannot_update_posted_expense()
    {
        $expense = CashExpense::factory()
            ->for($this->session)
            ->posted()
            ->create();

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Cannot update posted expense');

        $this->service->updateExpense($expense, ['amount' => 200.00]);
    }

    #[Test]
    public function it_can_delete_draft_expense()
    {
        $expense = CashExpense::factory()
            ->for($this->session)
            ->draft()
            ->create();

        $expenseId = $expense->id;
        $result = $this->service->deleteExpense($expense);

        $this->assertTrue($result);
        $this->assertDatabaseMissing('cash_expenses', ['id' => $expenseId]);
    }

    #[Test]
    public function it_cannot_delete_posted_expense()
    {
        $expense = CashExpense::factory()
            ->for($this->session)
            ->posted()
            ->create();

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Cannot delete posted expense');

        $this->service->deleteExpense($expense);
    }

    #[Test]
    public function it_can_get_session_expenses_summary()
    {
        CashExpense::factory()
            ->for($this->session)
            ->posted()
            ->cash()
            ->category('SUPPLIES')
            ->create(['amount' => 100.00]);

        CashExpense::factory()
            ->for($this->session)
            ->posted()
            ->card()
            ->category('MAINTENANCE')
            ->create(['amount' => 200.00]);

        CashExpense::factory()
            ->for($this->session)
            ->posted()
            ->transfer()
            ->category('OTHER')
            ->create(['amount' => 300.00]);

        $summary = $this->service->getSessionExpensesSummary($this->session);

        $this->assertArrayHasKey('total_expenses', $summary);
        $this->assertArrayHasKey('by_tender_type', $summary);
        $this->assertArrayHasKey('by_category', $summary);
        $this->assertEquals(600.00, $summary['total_expenses']);
    }

    #[Test]
    public function it_can_get_category_statistics()
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
            ->create(['amount' => 150.00]);

        CashExpense::factory()
            ->for($this->session)
            ->posted()
            ->category('MAINTENANCE')
            ->create(['amount' => 500.00]);

        $stats = $this->service->getCategoryStatistics(
            cashRegisterId: $this->session->cash_register_id,
            fromDate: now()->subDays(7)->format('Y-m-d'),
            toDate: now()->format('Y-m-d')
        );

        $this->assertArrayHasKey('categories', $stats);
        $this->assertArrayHasKey('total_expenses', $stats);
        $this->assertEquals(750.00, $stats['total_expenses']);
        $this->assertEquals(3, $stats['total_count']);

        // Find SUPPLIES category in the results
        $suppliesCategory = collect($stats['categories'])->firstWhere('category', 'SUPPLIES');
        $this->assertNotNull($suppliesCategory);
        $this->assertEquals(250.00, $suppliesCategory['total']);
        $this->assertEquals(2, $suppliesCategory['count']);
    }

    #[Test]
    public function it_validates_tender_type_requirements()
    {
        // CARD requires terminal
        $this->expectException(\Exception::class);

        $this->service->registerExpense(
            session: $this->session,
            tenderType: 'CARD',
            amount: 100.00,
            category: 'SUPPLIES',
            vendor: null,
            reference: null,
            notes: null,
            cardTerminalId: null, // Missing - should throw exception
            bankAccountId: null,
            createdBy: $this->user,
            incurredAt: null,
            meta: []
        );
    }

    #[Test]
    public function it_filters_expenses_by_category()
    {
        CashExpense::factory()
            ->for($this->session)
            ->posted()
            ->category('SUPPLIES')
            ->count(3)
            ->create();

        CashExpense::factory()
            ->for($this->session)
            ->posted()
            ->category('MAINTENANCE')
            ->count(2)
            ->create();

        $suppliesExpenses = CashExpense::where('cash_session_id', $this->session->id)
            ->byCategory('SUPPLIES')
            ->get();

        $this->assertCount(3, $suppliesExpenses);
    }
}
