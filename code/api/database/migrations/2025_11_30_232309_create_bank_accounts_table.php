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
        Schema::create('bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->string('alias')->comment('Account nickname');
            $table->string('bank_name');
            $table->string('account_number_masked')->comment('Masked account number (last 4 digits)');
            $table->string('clabe_masked')->nullable()->comment('Masked CLABE (first 3 + last 4)');
            $table->boolean('is_active')->default(true);
            $table->json('meta')->nullable()->comment('Additional account metadata');
            $table->timestamps();

            // Indexes
            $table->index('branch_id');
            $table->index('is_active');
            $table->index(['branch_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bank_accounts');
    }
};
