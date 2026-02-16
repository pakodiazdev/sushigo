<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Replace the plain unique constraint on employees.code with a partial
     * unique index that excludes soft-deleted rows, allowing code reuse
     * after an employee is soft-deleted.
     */
    public function up(): void
    {
        // Drop the existing unique constraint
        DB::statement('ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_code_unique');
        DB::statement('DROP INDEX IF EXISTS employees_code_unique');

        // Create a partial unique index (PostgreSQL) that only enforces
        // uniqueness among non-deleted rows
        DB::statement('CREATE UNIQUE INDEX employees_code_unique ON employees (code) WHERE deleted_at IS NULL');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS employees_code_unique');

        // Restore the original plain unique constraint
        DB::statement('CREATE UNIQUE INDEX employees_code_unique ON employees (code)');
    }
};
