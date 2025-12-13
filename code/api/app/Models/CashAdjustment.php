<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CashAdjustment extends Model
{
    use HasFactory;

    protected $fillable = [
        'cash_session_id',
        'source_system',
        'type',
        'direction',
        'notes',
        'posted_by',
        'posted_at',
        'meta',
    ];

    protected $casts = [
        'posted_at' => 'datetime',
        'meta' => 'array',
    ];

    // Type constants
    public const TYPE_EXTERNAL_IMPORT = 'EXTERNAL_IMPORT';
    public const TYPE_CORRECTION = 'CORRECTION';

    // Direction constants
    public const DIRECTION_INFLOW = 'INFLOW';
    public const DIRECTION_OUTFLOW = 'OUTFLOW';

    /**
     * Get the session that owns the adjustment
     */
    public function cashSession(): BelongsTo
    {
        return $this->belongsTo(CashSession::class);
    }

    /**
     * Get all lines for this adjustment
     */
    public function lines(): HasMany
    {
        return $this->hasMany(CashAdjustmentLine::class);
    }

    /**
     * Get the user who posted this adjustment
     */
    public function postedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    /**
     * Scope to filter posted adjustments
     */
    public function scopePosted($query)
    {
        return $query->whereNotNull('posted_at');
    }

    /**
     * Scope to filter draft adjustments
     */
    public function scopeDraft($query)
    {
        return $query->whereNull('posted_at');
    }

    /**
     * Scope to filter by type
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope to filter by direction
     */
    public function scopeByDirection($query, string $direction)
    {
        return $query->where('direction', $direction);
    }

    /**
     * Scope to filter inflow adjustments
     */
    public function scopeInflow($query)
    {
        return $query->where('direction', self::DIRECTION_INFLOW);
    }

    /**
     * Scope to filter outflow adjustments
     */
    public function scopeOutflow($query)
    {
        return $query->where('direction', self::DIRECTION_OUTFLOW);
    }

    /**
     * Check if adjustment is posted
     */
    public function isPosted(): bool
    {
        return $this->posted_at !== null;
    }

    /**
     * Get total amount from all lines
     */
    public function getTotalAmount(): float
    {
        return $this->lines()->sum('amount');
    }
}
