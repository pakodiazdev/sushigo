<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            // null = inherit the tenant default. Only 'ContractualPolicy' is
            // a valid non-null value today — see VacationEntitlementResolver.
            $table->string('vacation_entitlement_rule_key')->nullable()->after('meta');
            $table->json('vacation_entitlement_custom_table')->nullable()->after('vacation_entitlement_rule_key');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['vacation_entitlement_rule_key', 'vacation_entitlement_custom_table']);
        });
    }
};
