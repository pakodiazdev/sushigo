<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schedule_day_overrides', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->foreignId('employment_period_id')->constrained('employment_periods')->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week');
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->boolean('is_day_off')->default(false);
            $table->time('expected_start')->nullable();
            $table->time('expected_lunch_start')->nullable();
            $table->time('expected_lunch_end')->nullable();
            $table->smallInteger('lunch_duration_minutes')->nullable();
            $table->time('expected_end')->nullable();
            $table->string('note')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['employment_period_id', 'day_of_week', 'effective_from']);
        });

        DB::statement('ALTER TABLE schedule_day_overrides ADD CONSTRAINT chk_sdo_day_of_week CHECK (day_of_week BETWEEN 1 AND 7)');
        DB::statement('ALTER TABLE schedule_day_overrides ADD CONSTRAINT chk_sdo_effective_range CHECK (effective_to IS NULL OR effective_to >= effective_from)');
        DB::statement('ALTER TABLE schedule_day_overrides ADD CONSTRAINT chk_sdo_lunch_minutes CHECK (lunch_duration_minutes IS NULL OR (lunch_duration_minutes >= 1 AND lunch_duration_minutes <= 480))');
    }

    public function down(): void
    {
        Schema::dropIfExists('schedule_day_overrides');
    }
};
