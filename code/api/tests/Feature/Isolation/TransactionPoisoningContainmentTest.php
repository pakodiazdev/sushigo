<?php

namespace Tests\Feature\Isolation;

use App\Models\Stock;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Inventory\InventoryTestCase;
use Tests\Support\DatabaseIsolationGuard;

/**
 * Issue #578 — regression coverage for the Inventory → Payroll shard cascade.
 *
 * Root cause, reproduced here: a duplicate (inventory_location_id,
 * item_variant_id) insert raises SQLSTATE 23505 on `unique_stock_per_location`;
 * PostgreSQL then aborts the surrounding transaction, so every later statement
 * on that connection raises SQLSTATE 25P02 until the transaction ends. These
 * tests prove:
 *
 *  - the constraint is still enforced (not weakened to dodge the flake);
 *  - a test that provokes the abort recovers within its own transaction;
 *  - a following, unrelated (Payroll-style) test runs against a clean
 *    transaction and cannot inherit the abort — in either method order.
 */
class TransactionPoisoningContainmentTest extends InventoryTestCase
{
    private function makeVariant(): int
    {
        $item = $this->createItem();

        return $this->createItemVariant($item)->id;
    }

    /**
     * @return array<string, int|float>
     */
    private function stockRow(int $variantId, float $onHand = 5): array
    {
        return [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variantId,
            'on_hand' => $onHand,
            'reserved' => 0,
            'weighted_avg_cost' => 1,
        ];
    }

    #[Test]
    public function unique_stock_per_location_is_still_enforced(): void
    {
        $variantId = $this->makeVariant();

        Stock::create($this->stockRow($variantId));

        $this->expectException(UniqueConstraintViolationException::class);

        Stock::create($this->stockRow($variantId, onHand: 9));
    }

    #[Test]
    public function the_collision_reports_sqlstate_23505(): void
    {
        $variantId = $this->makeVariant();

        Stock::create($this->stockRow($variantId));

        try {
            Stock::create($this->stockRow($variantId));
            $this->fail('Expected a unique-constraint violation on the duplicate stock row.');
        } catch (QueryException $e) {
            $this->assertSame('23505', $e->getCode());
        }
    }

    #[Test]
    public function aaa_a_poisoning_test_recovers_inside_its_own_transaction(): void
    {
        $variantId = $this->makeVariant();

        Stock::create($this->stockRow($variantId));

        // Swallow the collision the way a careless test would.
        try {
            Stock::create($this->stockRow($variantId));
        } catch (QueryException) {
            // ignored on purpose
        }

        // Same test, right after the abort: the transaction is poisoned (25P02)…
        try {
            DB::select('SELECT 1');
            $this->fail('Expected SQLSTATE 25P02 immediately after the aborted transaction.');
        } catch (QueryException $e) {
            $this->assertSame('25P02', $e->getCode());
        }

        // …and RefreshDatabase will roll this whole transaction back at tearDown,
        // so the abort cannot outlive this test method.
        $this->assertSame(1, DB::connection()->transactionLevel());
    }

    #[Test]
    public function zzz_a_following_payroll_style_test_gets_a_clean_transaction(): void
    {
        // No expectException, no try/catch: a plain write + read must simply work,
        // proving this test did not inherit the previous test's aborted transaction.
        $before = DB::table('users')->count();

        User::factory()->create([
            'first_name' => 'Payroll',
            'last_name' => 'Reader',
            'email' => 'payroll-reader@sushigo.com',
        ]);

        $this->assertSame($before + 1, DB::table('users')->count());
    }

    #[Test]
    public function the_test_database_is_advisory_locked_against_concurrent_processes(): void
    {
        // The guard takes a PostgreSQL session advisory lock on a standalone
        // connection at first-test bootstrap; a second PHPUnit process pointed at
        // the same database would fail pg_try_advisory_lock and abort.
        $this->assertTrue(
            DatabaseIsolationGuard::holdsExclusiveLock(),
            'The isolation guard should hold the exclusive-access advisory lock during the suite.',
        );

        $stillHeld = DB::selectOne(
            "SELECT pg_try_advisory_lock(hashtext('sushigo-phpunit-suite')) AS acquired"
        );

        // A different connection must NOT be able to take the same lock now.
        $this->assertFalse(
            filter_var($stillHeld->acquired, FILTER_VALIDATE_BOOLEAN),
            'A second connection acquired the suite advisory lock — exclusivity is not enforced.',
        );
    }
}
