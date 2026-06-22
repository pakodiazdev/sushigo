<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE holiday_definitions DROP CONSTRAINT IF EXISTS holiday_definitions_recurrence_type_check');
        DB::statement("ALTER TABLE holiday_definitions ADD CONSTRAINT holiday_definitions_recurrence_type_check CHECK (recurrence_type IN ('fixed','nth_weekday','floating','none','easter_offset'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE holiday_definitions DROP CONSTRAINT IF EXISTS holiday_definitions_recurrence_type_check');
        DB::statement("ALTER TABLE holiday_definitions ADD CONSTRAINT holiday_definitions_recurrence_type_check CHECK (recurrence_type IN ('fixed','nth_weekday','floating','none'))");
    }
};
