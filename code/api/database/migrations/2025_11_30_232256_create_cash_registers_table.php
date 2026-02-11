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
        Schema::create('cash_registers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->foreignId('operating_unit_id')->nullable()->constrained('operating_units')->onDelete('set null');
            $table->string('code', 50)->unique()->comment('Unique register code');
            $table->string('name');
            $table->enum('type', ['ON_PREMISE', 'DELIVERY', 'EVENT'])->comment('Register type');
            $table->boolean('is_active')->default(true);
            $table->json('meta')->nullable()->comment('Additional metadata like external system aliases');
            $table->timestamps();

            $table->index('branch_id');
            $table->index('operating_unit_id');
            $table->index('type');
            $table->index('is_active');
            $table->index(['branch_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_registers');
    }
};
