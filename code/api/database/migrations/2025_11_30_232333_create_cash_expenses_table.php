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
        Schema::create('cash_expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_session_id')->constrained('cash_sessions')->onDelete('cascade');
            $table->enum('tender_type', ['CASH', 'CARD', 'TRANSFER'])->comment('Payment tender type');
            $table->decimal('amount', 12, 4)->comment('Expense amount');
            $table->string('category')->comment('Expense category');
            $table->string('vendor')->comment('Vendor/supplier name');
            $table->string('reference')->nullable()->comment('Invoice/receipt number');
            $table->text('notes')->nullable();
            $table->foreignId('card_terminal_id')->nullable()->constrained('cash_terminals')->onDelete('set null');
            $table->foreignId('bank_account_id')->nullable()->constrained('bank_accounts')->onDelete('set null');
            $table->timestamp('incurred_at')->comment('When expense was incurred');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('posted_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('posted_at')->nullable();
            $table->json('meta')->nullable()->comment('Additional expense metadata');
            $table->timestamps();

            // Indexes
            $table->index('cash_session_id');
            $table->index('tender_type');
            $table->index('category');
            $table->index('created_by');
            $table->index('posted_by');
            $table->index('incurred_at');
            $table->index(['cash_session_id', 'category']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_expenses');
    }
};
