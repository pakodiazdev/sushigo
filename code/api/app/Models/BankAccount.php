<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BankAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'alias',
        'bank_name',
        'account_number_masked',
        'clabe_masked',
        'is_active',
        'meta',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'meta' => 'array',
    ];

    /**
     * Get the branch that owns the bank account
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get adjustment lines using this bank account
     */
    public function adjustmentLines(): HasMany
    {
        return $this->hasMany(CashAdjustmentLine::class);
    }

    /**
     * Get expenses using this bank account
     */
    public function expenses(): HasMany
    {
        return $this->hasMany(CashExpense::class);
    }

    /**
     * Scope to filter active accounts
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter by branch
     */
    public function scopeByBranch($query, int $branchId)
    {
        return $query->where('branch_id', $branchId);
    }
}
