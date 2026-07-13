<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // OvertimeMovementType has no EXPIRED/TRANSFERRED case — remap any legacy rows before the
        // column is cast to that enum, otherwise reading them back would throw a ValueError.
        // EXPIRED (minutes removed from the bank) maps to USED; TRANSFERRED (moved elsewhere) maps
        // to ADJUSTMENT, the closest equivalent in the new vocabulary.
        DB::table('overtime_bank_movements')->where('type', 'EXPIRED')->update(['type' => 'USED']);
        DB::table('overtime_bank_movements')->where('type', 'TRANSFERRED')->update(['type' => 'ADJUSTMENT']);

        // The original enum('type', ['EARNED', 'PAID', 'EXPIRED', 'TRANSFERRED']) is enforced
        // via a Postgres CHECK constraint that keeps its auto-generated name across the rename
        // below, so it must be dropped before movement_type can hold the full
        // OvertimeMovementType set (EARNED|USED|PAID|ADJUSTMENT).
        DB::statement('ALTER TABLE overtime_bank_movements DROP CONSTRAINT IF EXISTS overtime_bank_movements_type_check');

        Schema::table('overtime_bank_movements', function (Blueprint $table) {
            $table->renameColumn('type', 'movement_type');
            $table->string('origin')->default('AUTO')->after('movement_type');
            $table->string('valuation_method')->nullable()->after('minutes');
            $table->decimal('applied_rate', 8, 2)->nullable()->after('valuation_method');
            $table->decimal('amount', 10, 2)->nullable()->after('applied_rate');
            $table->foreignId('authorized_by')->nullable()->after('amount')->constrained('users')->nullOnDelete();
            $table->dateTime('authorized_at')->nullable()->after('authorized_by');
            $table->string('reason')->nullable()->after('authorized_at');
        });

        // Note: `minutes` stays as-is (originally unsignedInteger). Postgres has no native unsigned
        // integer type, so Laravel's grammar already compiles unsignedInteger() to a plain signed
        // `integer` here with no CHECK constraint — confirmed negative values (needed by
        // OvertimeMovementType::ADJUSTMENT, which passes minutes through signed) are already
        // storable, no column type change required.
    }

    public function down(): void
    {
        Schema::table('overtime_bank_movements', function (Blueprint $table) {
            $table->dropConstrainedForeignId('authorized_by');
            $table->dropColumn(['origin', 'valuation_method', 'applied_rate', 'amount', 'authorized_at', 'reason']);
            $table->renameColumn('movement_type', 'type');
        });

        // USED/ADJUSTMENT rows created after this migration ran have no equivalent in the legacy
        // set — remapped back to their closest original meaning so the restored CHECK constraint
        // doesn't reject them (this is a best-effort revert, not a lossless one).
        DB::table('overtime_bank_movements')->where('type', 'USED')->update(['type' => 'EXPIRED']);
        DB::table('overtime_bank_movements')->where('type', 'ADJUSTMENT')->update(['type' => 'TRANSFERRED']);

        DB::statement("ALTER TABLE overtime_bank_movements ADD CONSTRAINT overtime_bank_movements_type_check CHECK (type IN ('EARNED', 'PAID', 'EXPIRED', 'TRANSFERRED'))");
    }
};
