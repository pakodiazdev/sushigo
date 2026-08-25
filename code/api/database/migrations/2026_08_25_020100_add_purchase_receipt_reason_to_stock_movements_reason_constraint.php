<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_reason_check');
        DB::statement("ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_reason_check CHECK (reason IN ('TRANSFER', 'RETURN', 'SALE', 'ADJUSTMENT', 'CONSUMPTION', 'OPENING_BALANCE', 'COUNT_VARIANCE', 'PURCHASE_RECEIPT', 'PURCHASE_RECEIPT_REVERSAL'))");
    }

    public function down(): void
    {
        $hasReceiptRows = DB::table('stock_movements')
            ->whereIn('reason', ['PURCHASE_RECEIPT', 'PURCHASE_RECEIPT_REVERSAL'])
            ->exists();

        if ($hasReceiptRows) {
            // Reinstating the narrower constraint here would reject rows this
            // migration's own reasons already created, failing the rollback
            // outright. Leave the wider constraint in place instead — the
            // receipts-domain migration itself must be rolled back first.
            return;
        }

        DB::statement('ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_reason_check');
        DB::statement("ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_reason_check CHECK (reason IN ('TRANSFER', 'RETURN', 'SALE', 'ADJUSTMENT', 'CONSUMPTION', 'OPENING_BALANCE', 'COUNT_VARIANCE'))");
    }
};
