<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schedule_days', function (Blueprint $table) {
            $table->smallInteger('lunch_duration_minutes')
                ->nullable()
                ->after('expected_lunch_end')
                ->comment(
                    'Expected lunch break duration in minutes (e.g. 60). '.
                    'Used to calculate the expected return time dynamically: '.
                    'expected_return = attendance.lunch_start + lunch_duration_minutes. '.
                    'NULL = no lunch tardiness tracking for this day.'
                );
        });
    }

    public function down(): void
    {
        Schema::table('schedule_days', function (Blueprint $table) {
            $table->dropColumn('lunch_duration_minutes');
        });
    }
};
