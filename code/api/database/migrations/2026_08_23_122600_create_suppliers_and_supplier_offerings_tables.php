<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->string('code', 50);
            $table->string('name');
            $table->string('contact_name')->nullable();
            $table->string('email')->nullable();
            $table->string('phone', 50)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_active', 'name']);
        });

        DB::statement('create unique index suppliers_code_unique on suppliers (code) where deleted_at is null');

        Schema::create('supplier_offerings', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->foreignId('supplier_id')->constrained()->restrictOnDelete();
            $table->foreignId('variant_purchase_presentation_id')
                ->constrained('variant_purchase_presentations')
                ->restrictOnDelete();
            $table->string('supplier_code', 100)->nullable();
            $table->decimal('quoted_price', 15, 4);
            $table->string('currency', 3)->default('MXN');
            $table->date('valid_from')->nullable();
            $table->date('valid_until')->nullable();
            $table->decimal('minimum_order_quantity', 15, 4)->default(1);
            $table->unsignedInteger('lead_time_days')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['supplier_id', 'is_active']);
            $table->index(['variant_purchase_presentation_id', 'is_active']);
        });

        DB::statement('create unique index supplier_offerings_unique_pair on supplier_offerings (supplier_id, variant_purchase_presentation_id) where deleted_at is null');
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_offerings');
        Schema::dropIfExists('suppliers');
    }
};
