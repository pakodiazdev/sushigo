<?php

namespace Tests\Support;

use Illuminate\Support\ConfigurationUrlParser;
use PDO;
use PDOException;
use RuntimeException;

/**
 * Enforces the API test-database isolation contract (issue #578).
 *
 * Two independent guarantees, checked once per PHPUnit process:
 *
 *  1. identity — the connection the suite is about to hammer resolves to a
 *     dedicated, disposable `*_test` database, never a developer's working
 *     database. A missing / blank `DB_DATABASE` otherwise falls back to `.env`
 *     and `RefreshDatabase` wipes the dev database.
 *
 *  2. exclusivity — no second PHPUnit process is already running against that
 *     exact database on that exact server. Proven with a PostgreSQL session
 *     advisory lock held on a standalone connection for the whole process; the
 *     lock is released automatically when the process exits.
 *
 * See doc/conventions/testing/test-database-isolation.md.
 */
final class DatabaseIsolationGuard
{
    /**
     * Databases that must never be used as the test database even if a future
     * rename happened to end in `_test`. Defence in depth on top of the suffix
     * rule in assertDedicatedTestDatabase().
     */
    private const DENYLIST = ['mydb', 'sushigo', 'postgres', 'template0', 'template1'];

    /**
     * A stable key naming "the SushiGo PHPUnit suite" for pg_try_advisory_lock.
     * hashtext() maps it to the int4 the advisory-lock functions expect.
     */
    private const ADVISORY_LOCK_KEY = 'sushigo-phpunit-suite';

    /** Pointer appended to every guard failure message. */
    private const SEE_DOC = 'See doc/conventions/testing/test-database-isolation.md.';

    /** Held for the process lifetime so the session advisory lock survives. */
    private static ?PDO $lockConnection = null;

    private static bool $verified = false;

    /**
     * @param  array<string, mixed>  $connectionConfig  the raw
     *                                                  config('database.connections.<default>')
     */
    public static function enforce(array $connectionConfig): void
    {
        if (self::$verified) {
            return;
        }

        // DB_URL, when set, overrides the individual database/host/credential
        // fields at connection time. Resolve it the exact way Laravel's
        // ConnectionFactory does, so the database we validate and advisory-lock
        // is the one RefreshDatabase will really connect to — not a stale
        // `database` key sitting next to a `url` that points somewhere else.
        $connectionConfig = (new ConfigurationUrlParser)->parseConfiguration($connectionConfig);

        self::assertDedicatedTestDatabase((string) ($connectionConfig['database'] ?? ''));

        // The suite is PostgreSQL-only in every environment (phpunit.xml pins
        // pgsql); stay defensive so a future sqlite-backed unit lane does not
        // trip over a Postgres-only probe.
        if (($connectionConfig['driver'] ?? 'pgsql') === 'pgsql') {
            // Fails closed: throws if the test database can't be reached to take
            // the lock, or if another process already holds it. `$verified` is
            // therefore set only once exclusivity is genuinely established — the
            // current test's setUp() aborts before it can reach migrate:fresh,
            // so no database test ever runs without the lock.
            self::assertExclusiveAccess($connectionConfig);
        }

        self::$verified = true;
    }

    /**
     * The database name a connection config actually resolves to, after a
     * `DB_URL` (if present) is parsed and merged the way Laravel's
     * ConnectionFactory does. Pure — safe to call from a plain unit test.
     *
     * @param  array<string, mixed>  $connectionConfig
     */
    public static function effectiveDatabaseName(array $connectionConfig): string
    {
        $resolved = (new ConfigurationUrlParser)->parseConfiguration($connectionConfig);

        return (string) ($resolved['database'] ?? '');
    }

    /**
     * The identity half — safe to call in isolation from a plain unit test.
     */
    public static function assertDedicatedTestDatabase(string $database): void
    {
        if ($database === '') {
            throw new RuntimeException(
                'No test database resolved: DB_DATABASE is empty. PHPUnit would fall back to '
                .'the dev database and RefreshDatabase would wipe it. Set DB_DATABASE (dev-lab: '
                .'code/api/.env.testing; CI / standalone Docker: DB_DATABASE=mydb_test). '
                .self::SEE_DOC
            );
        }

        if (in_array($database, self::DENYLIST, true) || ! str_ends_with($database, '_test')) {
            throw new RuntimeException(
                "Refusing to run the test suite against '{$database}': it is not a dedicated "
                .'`*_test` database. CI shards and concurrent dev-lab workspaces must each own a '
                .'distinct, disposable test database. '
                .self::SEE_DOC
            );
        }
    }

    /**
     * @param  array<string, mixed>  $connectionConfig
     */
    private static function assertExclusiveAccess(array $connectionConfig): void
    {
        $host = (string) ($connectionConfig['host'] ?? '127.0.0.1');
        $port = (string) ($connectionConfig['port'] ?? '5432');
        $database = (string) $connectionConfig['database'];

        $dsn = "pgsql:host={$host};port={$port};dbname={$database}";

        try {
            $pdo = new PDO(
                $dsn,
                $connectionConfig['username'] ?? null,
                $connectionConfig['password'] ?? null,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
            );
        } catch (PDOException $e) {
            // Fail closed. The suite must not proceed to migrate:fresh / use the
            // database without holding the lock, so abort this test's setup with
            // a clear message instead of letting it run unlocked.
            throw new RuntimeException(
                "Could not connect to test database '{$database}' on {$host}:{$port} to take the "
                .'isolation advisory lock: '.$e->getMessage().'. Start PostgreSQL (dev-lab: '
                .'`docker compose up -d` from the sushigo-dev-lab root) and re-run. '
                .self::SEE_DOC,
                0,
                $e,
            );
        }

        $locked = $pdo
            ->query('SELECT pg_try_advisory_lock(hashtext('.$pdo->quote(self::ADVISORY_LOCK_KEY).'))')
            ->fetchColumn();

        // pdo_pgsql may hand a boolean column back as bool or as the string 't'/'f'.
        if (! in_array($locked, [true, 't', '1', 1], true)) {
            throw new RuntimeException(
                "Test database '{$database}' on {$host}:{$port} is already locked by another "
                .'PHPUnit process. CI shards and dev-lab workspaces must not share a test '
                .'database — a concurrent run corrupts RefreshDatabase schema setup and produces '
                .'SQLSTATE[40P01] deadlocks and cross-suite failures. '
                .self::SEE_DOC
            );
        }

        self::$lockConnection = $pdo;
    }

    /**
     * The containment half — decides whether a connection left the test at a
     * different transaction depth than the isolation contract allows. Pure and
     * side-effect free so the decision can be unit-tested without a database.
     *
     * A PostgreSQL error aborts its transaction (SQLSTATE 25P02); every later
     * statement on that connection then fails until the transaction ends.
     * RefreshDatabase begins exactly one wrapping transaction per test on each
     * connection it manages, so the only acceptable end-of-test depth is the
     * expected one — passed in per connection by the caller (1 for a
     * RefreshDatabase-managed connection, 0 for an unmanaged one).
     *
     *  - depth ABOVE expected → an unclosed transaction or savepoint the next
     *    test reusing the connection would inherit (this is how an Inventory
     *    failure surfaced as an unrelated Payroll failure).
     *  - depth BELOW expected → the RefreshDatabase wrapper was committed or
     *    rolled back early, so this test's writes were committed for real and
     *    now leak into every later test in the process.
     *
     * @return string|null a human-readable violation description, or null if clean
     */
    public static function describeTransactionLeak(
        string $connection,
        int $level,
        int $expectedLevel,
    ): ?string {
        if ($level === $expectedLevel) {
            return null;
        }

        if ($level > $expectedLevel) {
            return "[{$connection}] left {$level} open transaction(s); expected {$expectedLevel} "
                .'(an unclosed transaction or savepoint)';
        }

        return "[{$connection}] dropped to transaction level {$level}; expected {$expectedLevel} "
            .'(the RefreshDatabase wrapper was committed or rolled back early — this test\'s '
            .'writes were committed for real and leak into later tests)';
    }

    /**
     * Whether this process currently holds the exclusive-access advisory lock on
     * its test database (true once assertExclusiveAccess() has succeeded).
     */
    public static function holdsExclusiveLock(): bool
    {
        return self::$lockConnection !== null;
    }
}
