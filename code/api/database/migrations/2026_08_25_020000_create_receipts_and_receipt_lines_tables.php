<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('receipts', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->foreignId('supplier_id')->constrained()->restrictOnDelete();
            $table->foreignId('destination_location_id')
                ->constrained('inventory_locations')
                ->restrictOnDelete();
            $table->string('reference', 255)->nullable();
            $table->date('receipt_date');
            $table->string('status', 20)->default('DRAFT');
            $table->text('notes')->nullable();
            $table->timestamp('posted_at')->nullable();
            $table->foreignId('posted_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reversed_at')->nullable();
            $table->foreignId('reversed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reversal_reason', 255)->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->json('meta')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'receipt_date']);
            $table->index(['supplier_id']);
            $table->index(['destination_location_id']);
        });

        DB::statement("ALTER TABLE receipts ADD CONSTRAINT receipts_status_check CHECK (status IN ('DRAFT', 'POSTED', 'REVERSED'))");

        Schema::create('receipt_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('receipt_id')->constrained()->cascadeOnDelete();
            $table->foreignId('variant_purchase_presentation_id')
                ->constrained('variant_purchase_presentations')
                ->restrictOnDelete();
            $table->foreignId('supplier_offering_id')
                ->nullable()
                ->constrained('supplier_offerings')
                ->restrictOnDelete();

            $table->decimal('ordered_packages', 15, 4)->default(0);
            $table->decimal('received_packages', 15, 4);
            $table->decimal('bonus_packages', 15, 4)->default(0);
            $table->decimal('presentation_factor', 15, 6);

            $table->decimal('gross_amount', 15, 4)->default(0);
            $table->decimal('discounts', 15, 4)->default(0);
            $table->decimal('allocated_expenses', 15, 4)->default(0);
            $table->decimal('non_recoverable_taxes', 15, 4)->default(0);
            $table->decimal('net_acquisition_amount', 15, 4);

            $table->decimal('base_units_received', 15, 4);
            $table->decimal('effective_unit_cost', 15, 4);

            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['receipt_id']);
            $table->index(['variant_purchase_presentation_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('receipt_lines');
        Schema::dropIfExists('receipts');
    }
};
