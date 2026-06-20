<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE holiday_definitions ALTER COLUMN recurrence_config SET DEFAULT '{}'::json");
        DB::statement("UPDATE holiday_definitions SET recurrence_config = '{}' WHERE recurrence_config IS NULL");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE holiday_definitions ALTER COLUMN recurrence_config DROP DEFAULT');
    }
};
