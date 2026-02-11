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
        Schema::create('cash_adjustment_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_adjustment_id')->constrained('cash_adjustments')->onDelete('cascade');
            $table->enum('tender_type', ['CASH', 'CARD', 'TRANSFER'])->comment('Payment tender type');
            $table->decimal('amount', 12, 4)->comment('Amount in base currency');
            $table->string('currency', 3)->default('MXN');
            $table->foreignId('card_terminal_id')->nullable()->constrained('cash_terminals')->onDelete('set null');
            $table->foreignId('bank_account_id')->nullable()->constrained('bank_accounts')->onDelete('set null');
            $table->string('reference')->nullable()->comment('External batch/transaction reference');
            $table->json('meta')->nullable()->comment('Tips, fees, additional charges');
            $table->timestamp('created_at');

            $table->index('cash_adjustment_id');
            $table->index('tender_type');
            $table->index('card_terminal_id');
            $table->index('bank_account_id');
            $table->index(['cash_adjustment_id', 'tender_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_adjustment_lines');
    }
};
