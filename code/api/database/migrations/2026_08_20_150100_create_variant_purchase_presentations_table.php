<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('variant_purchase_presentations', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();

            $table->foreignId('item_variant_id')
                ->constrained('item_variants')
                ->cascadeOnDelete()
                ->comment('The Variant this commercial package is assigned to');

            $table->foreignId('template_id')
                ->constrained('purchase_presentation_templates')
                ->comment('The reusable package template being instantiated');

            $table->string('package_barcode', 50)->nullable()->comment('Barcode printed on the package itself — separate namespace from ItemVariant.barcode (the unit barcode)');
            $table->boolean('is_default')->default(false)->comment('Whether this is the default presentation for the Variant');
            $table->boolean('is_active')->default(true)->comment('Assignment active status');
            $table->json('meta')->nullable()->comment('Additional metadata');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['item_variant_id', 'is_active']);
            $table->unique('package_barcode');
        });

        // One active default per Variant — mirrors
        // doc/architecture/product-catalog/product-catalog-architecture.en.md
        // §3.3. deleted_at is null is added on top of the documented rule so a
        // soft-deleted former default doesn't block a new one (same reasoning
        // as brands_name_unique in create_brands_table).
        DB::statement('create unique index variant_purchase_presentations_one_default_per_variant on variant_purchase_presentations (item_variant_id) where is_default = true and is_active = true and deleted_at is null');

        // A Variant cannot have the same template assigned twice while the
        // earlier assignment is still live — Technical Task "unique assignments".
        DB::statement('create unique index variant_purchase_presentations_unique_pair on variant_purchase_presentations (item_variant_id, template_id) where deleted_at is null');
    }

    public function down(): void
    {
        Schema::dropIfExists('variant_purchase_presentations');
    }
};
