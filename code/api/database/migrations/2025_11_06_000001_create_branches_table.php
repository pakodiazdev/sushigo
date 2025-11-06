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
        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique()->comment('Unique branch identifier code');
            $table->string('name', 255)->comment('Branch display name');
            $table->string('region', 100)->nullable()->comment('Geographic region or city');
            $table->string('timezone', 50)->default('UTC')->comment('Timezone for operations');
            $table->boolean('is_active')->default(true)->comment('Branch operational status');
            $table->json('meta')->nullable()->comment('Additional metadata');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_active', 'region']);
            $table->index('code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('branches');
    }
};
