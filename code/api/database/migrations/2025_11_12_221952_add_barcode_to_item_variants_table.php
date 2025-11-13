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
        Schema::table('item_variants', function (Blueprint $table) {
            $table->string('barcode', 50)
                ->nullable()
                ->after('code')
                ->comment('Product barcode (EAN, UPC, Code128, etc.)');
            
            $table->index('barcode');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('item_variants', function (Blueprint $table) {
            $table->dropIndex(['barcode']);
            $table->dropColumn('barcode');
        });
    }
};
