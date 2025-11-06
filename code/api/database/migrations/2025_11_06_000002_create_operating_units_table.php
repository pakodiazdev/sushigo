<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('operating_units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')
                ->constrained('branches')
                ->cascadeOnDelete()
                ->comment('Parent branch reference');
            
            $table->string('name', 255)->comment('Operating unit display name');
            $table->enum('type', [
                'BRANCH_MAIN',
                'BRANCH_BUFFER',
                'BRANCH_RETURN',
                'EVENT_TEMP'
            ])->comment('Type of operating unit');
            
            $table->date('start_date')->nullable()->comment('Start date for temporary units (events)');
            $table->date('end_date')->nullable()->comment('End date for temporary units (events)');
            $table->boolean('is_active')->default(true)->comment('Unit operational status');
            $table->json('meta')->nullable()->comment('Additional metadata');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['branch_id', 'is_active']);
            $table->index(['type', 'is_active']);
            $table->index(['start_date', 'end_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('operating_units');
    }
};
