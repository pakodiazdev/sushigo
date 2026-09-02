<?php

namespace Tests;

use Illuminate\Database\Events\TransactionCommitted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\RefreshDatabaseState;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Spatie\Permission\PermissionRegistrar;
use Tests\Support\DatabaseIsolationGuard;
use Throwable;

abstract class TestCase extends BaseTestCase
{
    /**
     * Issue #578: set when a real COMMIT (transaction depth back to 0) is
     * observed on a RefreshDatabase-managed connection during the test body —
     * i.e. the test committed its wrapping transaction. A follow-up
     * beginTransaction() in the same test would restore the depth to 1 and hide
     * that from the end-of-test depth check, so it is tracked as it happens.
     */
    private bool $managedWrapperCommitted = false;

    protected function setUp(): void
    {
        parent::setUp();

        // Clear Spatie permission cache before every test to prevent stale
        // role/permission data from leaking across tests when using
        // RefreshDatabase with transaction rollback.
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // The application is rebuilt per test, so this listener is per test. It
        // fires for every commit(), including nested ones — the depth === 0
        // guard narrows it to a real COMMIT of the wrapper.
        $this->managedWrapperCommitted = false;
        $managedConnections = $this->refreshDatabaseConnectionNames();

        if ($managedConnections !== []) {
            Event::listen(TransactionCommitted::class, function (TransactionCommitted $event) use ($managedConnections): void {
                if (in_array($event->connectionName, $managedConnections, true)
                    && $event->connection->transactionLevel() === 0) {
                    $this->managedWrapperCommitted = true;
                }
            });
        }
    }

    /**
     * Issue #578: enforce the test-database isolation contract at the earliest
     * safe point — right after the application (and its fully-resolved database
     * config, DB_URL included) is built, but BEFORE setUpTraits() lets
     * RefreshDatabase run `migrate:fresh` or open a transaction. Checking it in
     * setUp() (after the traits) would be too late: an unsafe database would
     * already have been wiped, or two colliding processes would both have
     * touched the schema before the advisory lock is tested. Idempotent — the
     * guard only does real work on the first test of the process.
     */
    protected function refreshApplication()
    {
        parent::refreshApplication();

        DatabaseIsolationGuard::enforce(
            $this->app['config']->get(
                'database.connections.'.$this->app['config']->get('database.default'),
                [],
            ),
        );
    }

    protected function tearDown(): void
    {
        // Issue #578: detect the violation and force-reset the connection(s)
        // FIRST, then run the framework teardown in a finally so RefreshDatabase
        // rollback, application cleanup and Carbon/Mockery reset are never
        // skipped by the diagnostic failure, and only then fail the test.
        $violation = $this->resolveDatabaseIsolationViolation();

        try {
            parent::tearDown();
        } finally {
            if ($violation !== null) {
                $this->fail($violation);
            }
        }
    }

    /**
     * Issue #578: fail loudly at the test that broke database isolation, instead
     * of letting a PostgreSQL abort (SQLSTATE 25P02) or committed-for-real rows
     * ride a shared connection into an unrelated later test and be misattributed
     * there. Every offending connection is force-reset so downstream tests in the
     * same process are unaffected regardless of this failure.
     */
    private function resolveDatabaseIsolationViolation(): ?string
    {
        $managedConnections = $this->refreshDatabaseConnectionNames();

        $violations = [];
        $committedForReal = false;

        foreach (DB::getConnections() as $name => $connection) {
            $level = $connection->transactionLevel();
            $isManaged = in_array((string) $name, $managedConnections, true);

            // RefreshDatabase wraps exactly the connections it manages in one
            // transaction each; any other resolved connection must be at depth 0.
            $expectedLevel = $isManaged ? 1 : 0;

            $violation = DatabaseIsolationGuard::describeTransactionLeak((string) $name, $level, $expectedLevel);

            // A managed connection whose wrapper was really committed mid-test is
            // dirty even if the test opened a replacement transaction to restore
            // the depth — the end-of-test level check alone can't see that.
            if ($violation === null && $isManaged && $this->managedWrapperCommitted) {
                $violation = "[{$name}] the RefreshDatabase wrapper was committed mid-test "
                    .'(a replacement transaction restored the depth) — its writes were committed for real';
            }

            if ($violation === null) {
                continue;
            }

            if ($level > $expectedLevel) {
                // An unclosed transaction/savepoint — roll it all the way back
                // so the next test on this connection starts clean.
                while ($connection->transactionLevel() > 0) {
                    try {
                        $connection->rollBack();
                    } catch (Throwable) {
                        break;
                    }
                }
            } else {
                // The RefreshDatabase wrapper was committed: these rows are real
                // now and nothing can roll them back. Mark the database dirty so
                // the next RefreshDatabase test re-runs migrate:fresh before it
                // begins, instead of inheriting the contamination.
                RefreshDatabaseState::$migrated = false;
                $committedForReal = true;
            }

            $connection->disconnect();
            $violations[] = $violation;
        }

        if ($violations === []) {
            return null;
        }

        $remedy = $committedForReal
            ? 'The test database was left with committed rows; it will be re-migrated (migrate:fresh) '
                .'before the next RefreshDatabase test.'
            : 'The connection(s) were force-reset so later tests are unaffected.';

        return 'Database isolation violated in '.static::class.'::'.$this->name().'() — '
            .implode('; ', $violations).'. '.$remedy.' Fix the transaction handling in this test. '
            .'See doc/conventions/testing/test-database-isolation.md.';
    }

    /**
     * The connection names RefreshDatabase wraps in a rollback transaction for
     * this test — its own source of truth (`connectionsToTransact()`), with the
     * trait's `null` "default connection" sentinel resolved to a real name.
     * Empty when the test does not use RefreshDatabase.
     *
     * @return list<string>
     */
    private function refreshDatabaseConnectionNames(): array
    {
        if (! in_array(RefreshDatabase::class, class_uses_recursive(static::class), true)
            || ! method_exists($this, 'connectionsToTransact')) {
            return [];
        }

        $default = (string) config('database.default');

        return array_values(array_map(
            static fn ($connection): string => (string) ($connection ?? $default),
            $this->connectionsToTransact(),
        ));
    }
}
