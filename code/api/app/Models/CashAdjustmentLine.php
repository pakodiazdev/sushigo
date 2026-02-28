<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashAdjustmentLine extends Model
{
    use HasFactory;

    const UPDATED_AT = null; // Table only has created_at

    protected $fillable = [
        'cash_adjustment_id',
        'tender_type',
        'amount',
        'currency',
        'card_terminal_id',
        'bank_account_id',
        'reference',
        'meta',
    ];

    protected $casts = [
        'amount' => 'decimal:4',
        'meta' => 'array',
        'created_at' => 'datetime',
    ];

    // Tender type constants
    public const TENDER_CASH = 'CASH';

    public const TENDER_CARD = 'CARD';

    public const TENDER_TRANSFER = 'TRANSFER';

    /**
     * Get the adjustment that owns the line
     */
    public function cashAdjustment(): BelongsTo
    {
        return $this->belongsTo(CashAdjustment::class);
    }

    /**
     * Get the card terminal (if tender type is CARD)
     */
    public function cardTerminal(): BelongsTo
    {
        return $this->belongsTo(CashTerminal::class, 'card_terminal_id');
    }

    /**
     * Get the bank account (if tender type is TRANSFER)
     */
    public function bankAccount(): BelongsTo
    {
        return $this->belongsTo(BankAccount::class);
    }

    /**
     * Scope to filter by tender type
     */
    public function scopeByTenderType($query, string $tenderType)
    {
        return $query->where('tender_type', $tenderType);
    }

    /**
     * Scope to filter cash lines
     */
    public function scopeCash($query)
    {
        return $query->where('tender_type', self::TENDER_CASH);
    }

    /**
     * Scope to filter card lines
     */
    public function scopeCard($query)
    {
        return $query->where('tender_type', self::TENDER_CARD);
    }

    /**
     * Scope to filter transfer lines
     */
    public function scopeTransfer($query)
    {
        return $query->where('tender_type', self::TENDER_TRANSFER);
    }

    /**
     * Check if line is cash tender
     */
    public function isCash(): bool
    {
        return $this->tender_type === self::TENDER_CASH;
    }

    /**
     * Check if line is card tender
     */
    public function isCard(): bool
    {
        return $this->tender_type === self::TENDER_CARD;
    }

    /**
     * Check if line is transfer tender
     */
    public function isTransfer(): bool
    {
        return $this->tender_type === self::TENDER_TRANSFER;
    }
}
