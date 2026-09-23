<?php

namespace App\Console\Commands;

use App\Support\Demo\DemoSandbox;
use Database\Seeders\Demo\DemoSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Restores the public Demo's canonical dataset (#635): truncates every
 * application table (schema and migration history are kept, so this never
 * needs to match a different code revision's migrations) and re-runs
 * DemoSeeder. Refuses to run anywhere but APP_ENV=demo — it is destructive by
 * design and must never be pointed at QA or Production data.
 *
 * Invoked explicitly only: by an operator, or by the demo-ops workflow's
 * schedule/dispatch. Demo's deploy pipeline never calls it.
 */
class DemoReset extends Command
{
    protected $signature = 'demo:reset';

    protected $description = 'Wipe the public Demo database and restore its canonical dataset (APP_ENV=demo only)';

    private const PRESERVED_TABLES = ['migrations'];

    public function handle(): int
    {
        if (! DemoSandbox::isActive()) {
            $this->error('⛔ demo:reset only runs when APP_ENV=demo (current: '.app()->environment().').');

            return self::FAILURE;
        }

        $this->info('🧹 Truncating Demo tables...');
        $this->truncateApplicationTables();

        try {
            $this->call('db:seed', ['--class' => DemoSeeder::class, '--force' => true]);
        } catch (Throwable $e) {
            $this->error('❌ Demo seeding failed: '.$e->getMessage());

            return self::FAILURE;
        }

        $this->info('✅ demo:reset completed');

        return self::SUCCESS;
    }

    private function truncateApplicationTables(): void
    {
        DB::statement('SET session_replication_role = replica;');

        try {
            foreach (Schema::getTableListing() as $table) {
                $name = str_contains($table, '.') ? substr(strrchr($table, '.'), 1) : $table;

                if (! in_array($name, self::PRESERVED_TABLES, true)) {
                    DB::table($table)->truncate();
                }
            }
        } finally {
            DB::statement('SET session_replication_role = DEFAULT;');
        }
    }
}
