<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Singleton settings row — no tenant_id column. Multi-tenancy is planned as
 * one database per tenant, so a single global row is sufficient today.
 */
class VacationPolicySetting extends Model
{
    protected $fillable = [
        'active_rule_key',
    ];

    public static function current(): self
    {
        return self::query()->first() ?? self::query()->create(['active_rule_key' => 'VacationsLFTMX']);
    }
}
