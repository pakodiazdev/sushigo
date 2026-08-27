<?php

namespace App\Models\Concerns;

use App\Exceptions\ImmutableStockMovementException;
use App\Exceptions\InvalidStockMovementContractException;
use App\Models\StockMovement;

/**
 * The append-only lifecycle plus the source/destination invariants of the
 * normalized Stock Movement contract (#438), kept off the StockMovement model
 * so the model stays small and the rules stay independently readable.
 *
 * Guards run on the `saving` event rather than `creating`/`updating`: the
 * HasPublicId trait registers a `creating` listener whose return value halts
 * the (halting) `creating` event before a second listener would run.
 * `saving` fires for both inserts and updates and is hooked by no other trait
 * on this model.
 */
trait EnforcesStockMovementContract
{
    /**
     * Business columns a POSTED movement may still change — the single legal
     * mutation of posted stock history is the POSTED -> REVERSED transition.
     *
     * @var list<string>
     */
    private static array $reversalTransitionColumns = [
        'status',
        'reversed_at',
        'reversed_by_user_id',
        'reversal_reason',
        'updated_at',
    ];

    public static function bootEnforcesStockMovementContract(): void
    {
        static::saving(function (StockMovement $movement): void {
            $movement->exists
                ? $movement->assertPostedHistoryUnchanged()
                : $movement->assertContractInvariants();
        });

        static::deleting(function (StockMovement $movement): void {
            if ($movement->status !== StockMovement::STATUS_DRAFT) {
                throw new ImmutableStockMovementException(
                    "StockMovement #{$movement->id} is {$movement->status}; posted stock history is non-deletable. "
                    .'Post a compensating reversal instead.'
                );
            }
        });
    }

    /**
     * Applied on every update: a REVERSED movement is frozen entirely, a
     * POSTED one is frozen except for the POSTED -> REVERSED transition, and a
     * DRAFT one stays editable but must still satisfy the contract.
     *
     * @throws ImmutableStockMovementException|InvalidStockMovementContractException
     */
    public function assertPostedHistoryUnchanged(): void
    {
        $originalStatus = $this->getOriginal('status');

        if ($originalStatus === StockMovement::STATUS_REVERSED) {
            throw new ImmutableStockMovementException(
                "StockMovement #{$this->id} is REVERSED and cannot be modified."
            );
        }

        if ($originalStatus !== StockMovement::STATUS_POSTED) {
            $this->assertContractInvariants();

            return;
        }

        $illegalColumns = array_diff(array_keys($this->getDirty()), self::$reversalTransitionColumns);

        if ($illegalColumns !== []) {
            throw new ImmutableStockMovementException(
                "StockMovement #{$this->id} is POSTED; posted stock history is append-only. "
                .'Illegal change to: '.implode(', ', $illegalColumns)
            );
        }

        if ($this->isDirty('status') && $this->status !== StockMovement::STATUS_REVERSED) {
            throw new ImmutableStockMovementException(
                "StockMovement #{$this->id}: a POSTED movement may only transition to REVERSED."
            );
        }
    }

    /**
     * Enforce the normalized contract before a movement is created or a draft
     * is edited: a strictly positive quantity, only DRAFT/POSTED assignable,
     * source and destination distinct when both present, and a
     * reason/source/destination shape that matches — except a compensating
     * reversal, which mirrors its original's direction and is checked
     * precisely against that original by StockMovementReverser.
     *
     * @throws InvalidStockMovementContractException
     */
    public function assertContractInvariants(): void
    {
        $status = $this->status ?? StockMovement::STATUS_POSTED;

        if (! in_array($status, [StockMovement::STATUS_DRAFT, StockMovement::STATUS_POSTED], true)) {
            throw new InvalidStockMovementContractException(
                "A StockMovement cannot be created or drafted with status {$status}."
            );
        }

        if ((float) $this->qty <= 0) {
            throw new InvalidStockMovementContractException('StockMovement.qty must be greater than zero.');
        }

        $from = $this->from_location_id;
        $to = $this->to_location_id;

        if ($from !== null && $to !== null && (int) $from === (int) $to) {
            throw new InvalidStockMovementContractException(
                'StockMovement source and destination locations must differ.'
            );
        }

        if ($this->reverses_stock_movement_id !== null) {
            if ($from === null && $to === null) {
                throw new InvalidStockMovementContractException(
                    'A reversal movement must move stock in at least one direction.'
                );
            }

            $this->assertOriginalNotAlreadyReversed();

            return;
        }

        $this->assertReasonDirection($from, $to);
    }

    /**
     * A posted movement is compensated at most once. Enforced here at the
     * application layer so no code path trips the DB-level
     * UNIQUE(reverses_stock_movement_id) constraint, whose raw violation
     * would abort the surrounding transaction.
     *
     * @throws InvalidStockMovementContractException
     */
    private function assertOriginalNotAlreadyReversed(): void
    {
        if ($this->exists) {
            return;
        }

        $alreadyReversed = static::query()
            ->where('reverses_stock_movement_id', $this->reverses_stock_movement_id)
            ->exists();

        if ($alreadyReversed) {
            throw new InvalidStockMovementContractException(
                "StockMovement #{$this->reverses_stock_movement_id} has already been reversed; "
                .'it can be compensated only once.'
            );
        }
    }

    /**
     * @throws InvalidStockMovementContractException
     */
    private function assertReasonDirection(?int $from, ?int $to): void
    {
        $expected = match (true) {
            in_array($this->reason, [StockMovement::REASON_OPENING_BALANCE, StockMovement::REASON_PURCHASE_RECEIPT], true) => 'entry',
            in_array($this->reason, [StockMovement::REASON_SALE, StockMovement::REASON_CONSUMPTION, StockMovement::REASON_PURCHASE_RECEIPT_REVERSAL], true) => 'exit',
            in_array($this->reason, [StockMovement::REASON_TRANSFER, StockMovement::REASON_RETURN], true) => 'move',
            in_array($this->reason, [StockMovement::REASON_ADJUSTMENT, StockMovement::REASON_COUNT_VARIANCE], true) => 'single',
            default => null,
        };

        if ($expected === null) {
            return;
        }

        $actual = match (true) {
            $from !== null && $to !== null => 'move',
            $from === null && $to !== null => 'entry',
            $from !== null && $to === null => 'exit',
            default => 'none',
        };

        $satisfied = $expected === 'single'
            ? in_array($actual, ['entry', 'exit'], true)
            : $actual === $expected;

        if (! $satisfied) {
            throw new InvalidStockMovementContractException(
                "Reason {$this->reason} does not permit a '{$actual}' source/destination shape."
            );
        }
    }
}
