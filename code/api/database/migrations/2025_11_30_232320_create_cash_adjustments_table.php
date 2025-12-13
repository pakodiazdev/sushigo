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
        Schema::create('cash_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_session_id')->constrained('cash_sessions')->onDelete('cascade');
            $table->string('source_system')->nullable()->comment('External system source');
            $table->enum('type', ['EXTERNAL_IMPORT', 'CORRECTION'])->comment('Adjustment type');
            $table->enum('direction', ['INFLOW', 'OUTFLOW'])->comment('Cash flow direction');
            $table->text('notes')->nullable();
            $table->foreignId('posted_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('posted_at')->nullable();
            $table->json('meta')->nullable()->comment('Additional adjustment metadata');
            $table->timestamps();

            // Indexes
            $table->index('cash_session_id');
            $table->index('type');
            $table->index('direction');
            $table->index('posted_by');
            $table->index('posted_at');
            $table->index(['cash_session_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_adjustments');
    }
};
