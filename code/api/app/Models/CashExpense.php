<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use App\Support\Traits\SerializesPublicIdAsId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashExpense extends Model
{
    use HasFactory, HasPublicId, SerializesPublicIdAsId;

    protected $fillable = [
        'cash_session_id',
        'tender_type',
        'amount',
        'category',
        'vendor',
        'reference',
        'notes',
        'card_terminal_id',
        'bank_account_id',
        'incurred_at',
        'created_by',
        'posted_by',
        'posted_at',
        'meta',
    ];

    protected $casts = [
        'amount' => 'decimal:4',
        'incurred_at' => 'datetime',
        'posted_at' => 'datetime',
        'meta' => 'array',
    ];

    /**
     * cash_session_id/card_terminal_id/bank_account_id point at models that
     * — like this one — expose public_id instead of their numeric id (see
     * #293). Hide the raw FKs so they don't leak numeric ids; consumers
     * should use the loaded relations' ids (already ULIDs) instead.
     */
    protected $hidden = [
        'cash_session_id',
        'card_terminal_id',
        'bank_account_id',
    ];

    // Tender type constants
    public const TENDER_CASH = 'CASH';

    public const TENDER_CARD = 'CARD';

    public const TENDER_TRANSFER = 'TRANSFER';

    /**
     * Get the session that owns the expense
     */
    public function cashSession(): BelongsTo
    {
        return $this->belongsTo(CashSession::class);
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
     * Get the user who created the expense
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who posted the expense
     */
    public function postedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    /**
     * Scope to filter posted expenses
     */
    public function scopePosted($query)
    {
        return $query->whereNotNull('posted_at');
    }

    /**
     * Scope to filter draft expenses
     */
    public function scopeDraft($query)
    {
        return $query->whereNull('posted_at');
    }

    /**
     * Scope to filter by category
     */
    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Scope to filter by tender type
     */
    public function scopeByTenderType($query, string $tenderType)
    {
        return $query->where('tender_type', $tenderType);
    }

    /**
     * Scope to filter by date range
     */
    public function scopeByDateRange($query, string $from, string $to)
    {
        return $query->whereBetween('incurred_at', [$from, $to]);
    }

    /**
     * Check if expense is posted
     */
    public function isPosted(): bool
    {
        return $this->posted_at !== null;
    }

    /**
     * Check if expense is cash tender
     */
    public function isCash(): bool
    {
        return $this->tender_type === self::TENDER_CASH;
    }

    /**
     * Check if expense is card tender
     */
    public function isCard(): bool
    {
        return $this->tender_type === self::TENDER_CARD;
    }

    /**
     * Check if expense is transfer tender
     */
    public function isTransfer(): bool
    {
        return $this->tender_type === self::TENDER_TRANSFER;
    }
}
