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
        Schema::create('units_of_measure', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique()->comment('Unique unit code (e.g., KG, L, UN)');
            $table->string('name', 100)->comment('Unit display name');
            $table->string('symbol', 10)->comment('Unit symbol for display');
            $table->smallInteger('precision')->default(2)->comment('Decimal precision for calculations');
            $table->boolean('is_decimal')->default(true)->comment('Whether unit supports decimal quantities');
            $table->boolean('is_active')->default(true)->comment('Unit active status');
            $table->json('meta')->nullable()->comment('Additional metadata');
            $table->timestamps();

            $table->index(['is_active', 'code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('units_of_measure');
    }
};
