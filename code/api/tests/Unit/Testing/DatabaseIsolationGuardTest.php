<?php

namespace Tests\Unit\Testing;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use RuntimeException;
use Tests\Support\DatabaseIsolationGuard;

/**
 * Issue #578 — the pure identity half of the API test-database isolation
 * contract: a resolved database name is only acceptable if it is a dedicated,
 * disposable `*_test` database and not a known developer working database.
 *
 * Extends PHPUnit's TestCase directly (not Tests\TestCase) so it never triggers
 * the very guard it is asserting on.
 */
class DatabaseIsolationGuardTest extends TestCase
{
    /**
     * @return array<string, array{string}>
     */
    public static function acceptedNames(): array
    {
        return [
            'CI / standalone' => ['mydb_test'],
            'dev-lab workspace a' => ['sushigo_ws_a_test'],
            'dev-lab workspace h' => ['sushigo_ws_h_test'],
        ];
    }

    /**
     * @return array<string, array{string}>
     */
    public static function rejectedNames(): array
    {
        return [
            'empty (fell back to .env)' => [''],
            'dev database' => ['mydb'],
            'dev-lab dev database' => ['sushigo_ws_a'],
            'bare postgres' => ['postgres'],
            'template db' => ['template1'],
            'no _test suffix' => ['sushigo'],
            'test in the middle only' => ['test_fixtures'],
        ];
    }

    #[Test]
    #[DataProvider('acceptedNames')]
    public function it_accepts_a_dedicated_test_database(string $name): void
    {
        DatabaseIsolationGuard::assertDedicatedTestDatabase($name);

        $this->addToAssertionCount(1);
    }

    #[Test]
    #[DataProvider('rejectedNames')]
    public function it_rejects_anything_that_is_not_a_dedicated_test_database(string $name): void
    {
        $this->expectException(RuntimeException::class);

        DatabaseIsolationGuard::assertDedicatedTestDatabase($name);
    }

    #[Test]
    public function the_empty_name_error_explains_the_env_fallback(): void
    {
        try {
            DatabaseIsolationGuard::assertDedicatedTestDatabase('');
            $this->fail('Expected a RuntimeException for an empty database name.');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('DB_DATABASE', $e->getMessage());
            $this->assertStringContainsString('test-database-isolation', $e->getMessage());
        }
    }

    #[Test]
    public function the_rejection_error_names_the_offending_database(): void
    {
        try {
            DatabaseIsolationGuard::assertDedicatedTestDatabase('mydb');
            $this->fail('Expected a RuntimeException for the dev database name.');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString("'mydb'", $e->getMessage());
            $this->assertStringContainsString('test-database-isolation', $e->getMessage());
        }
    }

    #[Test]
    public function effective_database_name_falls_back_to_the_database_field_without_a_url(): void
    {
        $this->assertSame('sushigo_ws_a_test', DatabaseIsolationGuard::effectiveDatabaseName([
            'database' => 'sushigo_ws_a_test',
        ]));
    }

    #[Test]
    public function effective_database_name_prefers_db_url_over_the_stale_database_field(): void
    {
        $this->assertSame('prod_db', DatabaseIsolationGuard::effectiveDatabaseName([
            'database' => 'mydb_test',
            'url' => 'pgsql://admin:secret@db.internal:5432/prod_db',
        ]));
    }

    #[Test]
    public function a_dev_database_selected_through_db_url_is_still_rejected(): void
    {
        $this->expectException(RuntimeException::class);

        DatabaseIsolationGuard::assertDedicatedTestDatabase(
            DatabaseIsolationGuard::effectiveDatabaseName([
                'database' => 'mydb_test',
                'url' => 'pgsql://admin:secret@db.internal:5432/mydb',
            ]),
        );
    }

    #[Test]
    public function a_connection_left_at_exactly_the_expected_level_is_clean(): void
    {
        $this->assertNull(DatabaseIsolationGuard::describeTransactionLeak('pgsql', 1, 1));
        $this->assertNull(DatabaseIsolationGuard::describeTransactionLeak('pgsql', 0, 0));
    }

    #[Test]
    public function a_level_above_the_expected_one_is_an_unclosed_transaction_leak(): void
    {
        $leak = DatabaseIsolationGuard::describeTransactionLeak('pgsql', 2, 1);

        $this->assertNotNull($leak);
        $this->assertStringContainsString('pgsql', $leak);
        $this->assertStringContainsString('2 open transaction(s)', $leak);
        $this->assertStringContainsString('expected 1', $leak);
        $this->assertStringContainsString('unclosed transaction or savepoint', $leak);
    }

    #[Test]
    public function a_level_below_the_expected_one_means_the_wrapper_was_committed_early(): void
    {
        // A RefreshDatabase test that over-commits drops its wrapper: level 0
        // where 1 is expected. Its rows are now committed for real.
        $leak = DatabaseIsolationGuard::describeTransactionLeak('pgsql', 0, 1);

        $this->assertNotNull($leak);
        $this->assertStringContainsString('dropped to transaction level 0', $leak);
        $this->assertStringContainsString('committed or rolled back early', $leak);
        $this->assertStringContainsString('leak into later tests', $leak);
    }

    #[Test]
    public function an_open_transaction_on_an_unmanaged_secondary_connection_is_a_leak(): void
    {
        // A connection RefreshDatabase does not wrap must be back at level 0.
        $this->assertNotNull(DatabaseIsolationGuard::describeTransactionLeak('secondary', 1, 0));
    }
}
