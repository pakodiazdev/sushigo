<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CashSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'cash_register_id',
        'operating_date',
        'status',
        'opening_balance',
        'closing_balance',
        'meta',
    ];

    protected $casts = [
        'operating_date' => 'date',
        'opening_balance' => 'decimal:4',
        'closing_balance' => 'decimal:4',
        'meta' => 'array',
    ];

    // Status constants
    public const STATUS_DRAFT = 'DRAFT';
    public const STATUS_POSTED = 'POSTED';

    /**
     * Get the register that owns the session
     */
    public function cashRegister(): BelongsTo
    {
        return $this->belongsTo(CashRegister::class);
    }

    /**
     * Get all adjustments for this session
     */
    public function adjustments(): HasMany
    {
        return $this->hasMany(CashAdjustment::class);
    }

    /**
     * Get all expenses for this session
     */
    public function expenses(): HasMany
    {
        return $this->hasMany(CashExpense::class);
    }

    /**
     * Scope to filter draft sessions
     */
    public function scopeDraft($query)
    {
        return $query->where('status', self::STATUS_DRAFT);
    }

    /**
     * Scope to filter posted sessions
     */
    public function scopePosted($query)
    {
        return $query->where('status', self::STATUS_POSTED);
    }

    /**
     * Scope to filter by register
     */
    public function scopeByRegister($query, int $registerId)
    {
        return $query->where('cash_register_id', $registerId);
    }

    /**
     * Scope to filter by date
     */
    public function scopeByDate($query, string $date)
    {
        return $query->where('operating_date', $date);
    }

    /**
     * Scope to filter by date range
     */
    public function scopeByDateRange($query, string $from, string $to)
    {
        return $query->whereBetween('operating_date', [$from, $to]);
    }

    /**
     * Check if session is draft
     */
    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    /**
     * Check if session is posted
     */
    public function isPosted(): bool
    {
        return $this->status === self::STATUS_POSTED;
    }

    /**
     * Calculate closing balance from adjustments and expenses
     */
    public function calculateClosingBalance(): float
    {
        $opening = (float) ($this->opening_balance ?? 0);

        // Sum posted inflow adjustments only
        $inflows = $this->adjustments()
            ->posted()
            ->where('direction', CashAdjustment::DIRECTION_INFLOW)
            ->with('lines')
            ->get()
            ->sum(function ($adjustment) {
                return $adjustment->lines->sum('amount');
            });

        // Sum posted outflow adjustments only
        $outflows = $this->adjustments()
            ->posted()
            ->where('direction', CashAdjustment::DIRECTION_OUTFLOW)
            ->with('lines')
            ->get()
            ->sum(function ($adjustment) {
                return $adjustment->lines->sum('amount');
            });

        // Sum posted expenses only
        $expensesTotal = $this->expenses()->posted()->sum('amount');

        return $opening + $inflows - $outflows - $expensesTotal;
    }
}
