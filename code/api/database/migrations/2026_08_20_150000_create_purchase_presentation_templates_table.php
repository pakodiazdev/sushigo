<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_presentation_templates', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->string('code', 50)->comment('Short admin-facing code, e.g. BOX_24');
            $table->string('name', 255)->comment('Display name, e.g. "Box x24"');
            $table->enum('package_type', ['UNIT', 'PACK', 'BOX', 'TRAY'])->comment('Commercial package shape');
            $table->decimal('base_unit_quantity', 15, 4)->comment('How many base UOM units this package contains');

            $table->foreignId('compatible_dimension_uom_id')
                ->constrained('units_of_measure')
                ->comment('The base UOM a Variant must use to accept this template — prevents an ambiguous Box<->Unit global conversion');

            $table->boolean('is_active')->default(true)->comment('Whether this template can be assigned to new Variants');
            $table->timestamps();
            $table->softDeletes();

            $table->index('is_active');
            $table->index('package_type');
        });

        // Partial unique index instead of a plain unique() column: code must
        // only be unique among non-deleted rows, matching the Store request's
        // Rule::unique(...)->whereNull('deleted_at') — mirrors brands_name_unique
        // (see create_brands_table migration) so a deactivated/deleted
        // template's code can be reused.
        DB::statement('create unique index purchase_presentation_templates_code_unique on purchase_presentation_templates (code) where deleted_at is null');
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_presentation_templates');
    }
};
