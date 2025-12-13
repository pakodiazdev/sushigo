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
        Schema::create('cash_terminals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->string('name')->comment('Terminal operator alias');
            $table->string('provider')->comment('Payment provider (CLIP, MERCADOPAGO, etc.)');
            $table->string('account_ref')->comment('Acquirer/merchant ID');
            $table->string('last_four', 4)->comment('Last 4 digits of terminal ID');
            $table->boolean('is_active')->default(true);
            $table->json('meta')->nullable()->comment('Additional terminal metadata');
            $table->timestamps();

            // Indexes
            $table->index('branch_id');
            $table->index('provider');
            $table->index('is_active');
            $table->index(['branch_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_terminals');
    }
};
