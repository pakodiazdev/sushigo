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
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('from_location_id')
                ->nullable()
                ->constrained('inventory_locations')
                ->nullOnDelete()
                ->comment('Source location (null for entries)');

            $table->foreignId('to_location_id')
                ->nullable()
                ->constrained('inventory_locations')
                ->nullOnDelete()
                ->comment('Target location (null for exits)');

            $table->foreignId('item_variant_id')
                ->constrained('item_variants')
                ->cascadeOnDelete()
                ->comment('Item variant moved');

            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete()
                ->comment('User who executed the movement');

            $table->decimal('qty', 15, 4)->comment('Quantity moved in base unit');

            $table->enum('reason', [
                'TRANSFER',
                'RETURN',
                'SALE',
                'ADJUSTMENT',
                'CONSUMPTION',
                'OPENING_BALANCE',
                'COUNT_VARIANCE'
            ])->comment('Movement reason code');

            $table->enum('status', [
                'DRAFT',
                'POSTED',
                'REVERSED'
            ])->default('POSTED')->comment('Movement status');

            $table->string('reference', 255)->nullable()->comment('External reference number');
            $table->unsignedBigInteger('related_id')->nullable()->comment('Related entity ID (sale, purchase, etc.)');
            $table->string('related_type', 100)->nullable()->comment('Related entity type');

            $table->text('notes')->nullable()->comment('Movement notes');
            $table->json('meta')->nullable()->comment('Additional metadata (original_qty, original_uom, cost, etc.)');
            $table->timestamp('posted_at')->nullable()->comment('When movement was posted');
            $table->timestamps();

            $table->index(['from_location_id', 'created_at']);
            $table->index(['to_location_id', 'created_at']);
            $table->index(['item_variant_id', 'created_at']);
            $table->index(['reason', 'status']);
            $table->index(['related_type', 'related_id']);
            $table->index('reference');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
