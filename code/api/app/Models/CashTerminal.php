<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CashTerminal extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'name',
        'provider',
        'account_ref',
        'last_four',
        'is_active',
        'meta',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'meta' => 'array',
    ];

    /**
     * Get the branch that owns the terminal
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get adjustment lines using this terminal
     */
    public function adjustmentLines(): HasMany
    {
        return $this->hasMany(CashAdjustmentLine::class, 'card_terminal_id');
    }

    /**
     * Get expenses using this terminal
     */
    public function expenses(): HasMany
    {
        return $this->hasMany(CashExpense::class, 'card_terminal_id');
    }

    /**
     * Scope to filter active terminals
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

    /**
     * Scope to filter by provider
     */
    public function scopeByProvider($query, string $provider)
    {
        return $query->where('provider', $provider);
    }
}
