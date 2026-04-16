<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('application_clock_state', function (Blueprint $table) {
            $table->id();
            $table->enum('mode', ['system', 'simulated'])->default('system');
            $table->dateTime('base_datetime_utc')->nullable();
            $table->dateTime('started_real_datetime_utc')->nullable();
            $table->string('timezone', 50)->default('America/Mexico_City');
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Insert the single row with system mode
        DB::table('application_clock_state')->insert([
            'mode' => 'system',
            'timezone' => config('app.business_timezone', 'America/Mexico_City'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('application_clock_state');
    }
};
