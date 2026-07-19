<?php

declare(strict_types=1);

namespace Tests\Unit\Actions\Payroll;

use App\Actions\Payroll\EnsurePeriodIsEditableAction;
use App\Models\Branch;
use App\Models\PayPeriod;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class EnsurePeriodIsEditableActionTest extends TestCase
{
    use RefreshDatabase;

    private function createPeriod(Branch $branch, string $status): PayPeriod
    {
        return PayPeriod::create([
            'branch_id' => $branch->id,
            'period_start' => '2026-06-22',
            'period_end' => '2026-06-28',
            'status' => $status,
        ]);
    }

    #[Test]
    public function returns_false_when_a_closed_period_covers_the_date(): void
    {
        $branch = Branch::factory()->create();
        $this->createPeriod($branch, PayPeriod::STATUS_CLOSED);

        $action = new EnsurePeriodIsEditableAction;

        $this->assertFalse($action($branch->id, '2026-06-25'));
    }

    #[Test]
    public function returns_true_when_the_covering_period_is_open(): void
    {
        $branch = Branch::factory()->create();
        $this->createPeriod($branch, PayPeriod::STATUS_OPEN);

        $action = new EnsurePeriodIsEditableAction;

        $this->assertTrue($action($branch->id, '2026-06-25'));
    }

    #[Test]
    public function returns_true_when_the_covering_period_is_reopened(): void
    {
        $branch = Branch::factory()->create();
        $this->createPeriod($branch, PayPeriod::STATUS_REOPENED);

        $action = new EnsurePeriodIsEditableAction;

        $this->assertTrue($action($branch->id, '2026-06-25'));
    }

    #[Test]
    public function returns_true_when_no_period_covers_the_date(): void
    {
        $branch = Branch::factory()->create();

        $action = new EnsurePeriodIsEditableAction;

        $this->assertTrue($action($branch->id, '2026-06-25'));
    }

    #[Test]
    public function returns_true_when_branch_id_or_date_is_missing(): void
    {
        $action = new EnsurePeriodIsEditableAction;

        $this->assertTrue($action(null, '2026-06-25'));
        $this->assertTrue($action(1, null));
    }
}
