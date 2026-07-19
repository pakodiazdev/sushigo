<?php

declare(strict_types=1);

namespace Tests\Unit\Models;

use App\Models\Branch;
use App\Models\PayPeriod;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PayPeriodCoveringDateTest extends TestCase
{
    use RefreshDatabase;

    private function createPeriod(Branch $branch, string $start, string $end, string $status): PayPeriod
    {
        return PayPeriod::create([
            'branch_id' => $branch->id,
            'period_start' => $start,
            'period_end' => $end,
            'status' => $status,
        ]);
    }

    #[Test]
    public function covering_date_finds_the_period_that_contains_the_date(): void
    {
        $branch = Branch::factory()->create();
        $period = $this->createPeriod($branch, '2026-06-22', '2026-06-28', PayPeriod::STATUS_CLOSED);

        $found = PayPeriod::coveringDate($branch->id, '2026-06-25');

        $this->assertNotNull($found);
        $this->assertTrue($found->is($period));
    }

    #[Test]
    public function covering_date_matches_the_boundary_dates_inclusively(): void
    {
        $branch = Branch::factory()->create();
        $period = $this->createPeriod($branch, '2026-06-22', '2026-06-28', PayPeriod::STATUS_CLOSED);

        $this->assertTrue(PayPeriod::coveringDate($branch->id, '2026-06-22')->is($period));
        $this->assertTrue(PayPeriod::coveringDate($branch->id, '2026-06-28')->is($period));
    }

    #[Test]
    public function covering_date_returns_null_when_no_period_covers_the_date(): void
    {
        $branch = Branch::factory()->create();
        $this->createPeriod($branch, '2026-06-22', '2026-06-28', PayPeriod::STATUS_CLOSED);

        $this->assertNull(PayPeriod::coveringDate($branch->id, '2026-06-29'));
    }

    #[Test]
    public function covering_date_never_matches_a_different_branch(): void
    {
        $branchA = Branch::factory()->create();
        $branchB = Branch::factory()->create();
        $this->createPeriod($branchA, '2026-06-22', '2026-06-28', PayPeriod::STATUS_CLOSED);

        $this->assertNull(PayPeriod::coveringDate($branchB->id, '2026-06-25'));
    }

    #[Test]
    public function covering_date_returns_a_reopened_period_too(): void
    {
        $branch = Branch::factory()->create();
        $period = $this->createPeriod($branch, '2026-06-22', '2026-06-28', PayPeriod::STATUS_REOPENED);

        $this->assertTrue(PayPeriod::coveringDate($branch->id, '2026-06-25')->is($period));
    }
}
