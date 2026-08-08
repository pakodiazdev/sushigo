<?php

namespace App\Services\CashAdjustments;

use App\Exceptions\CashAdjustmentAlreadyPostedException;
use App\Exceptions\InvalidCashAdjustmentLineException;
use App\Models\CashAdjustment;
use App\Models\CashAdjustmentLine;
use App\Models\CashSession;
use App\Models\User;
use App\Support\Clock\ApplicationClock;
use Illuminate\Support\Facades\DB;

class CashAdjustmentService
{
    public function __construct(private readonly ApplicationClock $clock) {}

    /**
     * Create a new adjustment with lines
     *
     * @param  array  $lines  [['tender_type' => 'CASH', 'amount' => 100.00, ...], ...]
     *
     * @throws InvalidCashAdjustmentLineException
     */
    public function createAdjustment(
        CashSession $session,
        string $type,
        string $direction,
        array $lines,
        ?string $sourceSystem = null,
        ?string $notes = null,
        array $meta = []
    ): CashAdjustment {
        if (empty($lines)) {
            throw new InvalidCashAdjustmentLineException('Adjustment must have at least one line');
        }

        DB::beginTransaction();
        try {
            // Create adjustment header
            $adjustment = CashAdjustment::create([
                'cash_session_id' => $session->id,
                'source_system' => $sourceSystem,
                'type' => $type,
                'direction' => $direction,
                'notes' => $notes,
                'meta' => $meta,
            ]);

            // Create adjustment lines
            foreach ($lines as $lineData) {
                $this->validateLineData($lineData);

                CashAdjustmentLine::create([
                    'cash_adjustment_id' => $adjustment->id,
                    'tender_type' => $lineData['tender_type'],
                    'amount' => $lineData['amount'],
                    'currency' => $lineData['currency'] ?? 'MXN',
                    'card_terminal_id' => $lineData['card_terminal_id'] ?? null,
                    'bank_account_id' => $lineData['bank_account_id'] ?? null,
                    'reference' => $lineData['reference'] ?? null,
                    'meta' => $lineData['meta'] ?? [],
                ]);
            }

            DB::commit();

            return $adjustment->fresh('lines');
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Create adjustment from external system report (e.g., POS, Uber Eats)
     */
    public function createFromExternalReport(
        CashSession $session,
        string $sourceSystem,
        array $lines,
        ?string $notes = null
    ): CashAdjustment {
        return $this->createAdjustment(
            session: $session,
            type: CashAdjustment::TYPE_EXTERNAL_IMPORT,
            direction: CashAdjustment::DIRECTION_INFLOW,
            lines: $lines,
            sourceSystem: $sourceSystem,
            notes: $notes
        );
    }

    /**
     * Create manual correction adjustment
     */
    public function createCorrection(
        CashSession $session,
        string $direction,
        array $lines,
        string $notes
    ): CashAdjustment {
        return $this->createAdjustment(
            session: $session,
            type: CashAdjustment::TYPE_CORRECTION,
            direction: $direction,
            lines: $lines,
            sourceSystem: 'MANUAL',
            notes: $notes
        );
    }

    /**
     * Post an adjustment (mark as finalized)
     *
     * @throws CashAdjustmentAlreadyPostedException
     */
    public function postAdjustment(CashAdjustment $adjustment, User $user): CashAdjustment
    {
        if ($adjustment->isPosted()) {
            throw new CashAdjustmentAlreadyPostedException('Adjustment is already posted');
        }

        $adjustment->posted_by = $user->id;
        $adjustment->posted_at = $this->clock->nowUtc();
        $adjustment->save();

        return $adjustment;
    }

    /**
     * Delete an adjustment (only if not posted)
     *
     * @throws CashAdjustmentAlreadyPostedException
     */
    public function deleteAdjustment(CashAdjustment $adjustment): bool
    {
        if ($adjustment->isPosted()) {
            throw new CashAdjustmentAlreadyPostedException('Cannot delete posted adjustment');
        }

        DB::beginTransaction();
        try {
            // Delete lines first
            $adjustment->lines()->delete();

            // Delete adjustment
            $adjustment->delete();

            DB::commit();

            return true;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Validate line data
     *
     * @throws InvalidCashAdjustmentLineException
     */
    private function validateLineData(array $lineData): void
    {
        if (! isset($lineData['tender_type'])) {
            throw new InvalidCashAdjustmentLineException('Line must have tender_type');
        }

        if (! isset($lineData['amount']) || $lineData['amount'] <= 0) {
            throw new InvalidCashAdjustmentLineException('Line must have positive amount');
        }

        // Validate tender-specific requirements
        if ($lineData['tender_type'] === 'CARD' && empty($lineData['card_terminal_id'])) {
            throw new InvalidCashAdjustmentLineException('CARD tender requires card_terminal_id');
        }

        if ($lineData['tender_type'] === 'TRANSFER' && empty($lineData['bank_account_id'])) {
            throw new InvalidCashAdjustmentLineException('TRANSFER tender requires bank_account_id');
        }
    }

    /**
     * Get adjustment summary
     */
    public function getAdjustmentSummary(CashAdjustment $adjustment): array
    {
        $lines = $adjustment->lines()->with(['cardTerminal', 'bankAccount'])->get();

        return [
            'adjustment_id' => $adjustment->id,
            'type' => $adjustment->type,
            'direction' => $adjustment->direction,
            'source_system' => $adjustment->source_system,
            'status' => $adjustment->isPosted() ? 'POSTED' : 'DRAFT',
            'posted_by' => $adjustment->posted_by,
            'posted_at' => $adjustment->posted_at?->format('Y-m-d H:i:s'),
            'total_amount' => $adjustment->getTotalAmount(),
            'lines_count' => $lines->count(),
            'lines' => $lines->map(fn ($line) => [
                'tender_type' => $line->tender_type,
                'amount' => (float) $line->amount,
                'reference' => $line->reference,
                'terminal' => $line->cardTerminal?->name,
                'bank_account' => $line->bankAccount?->alias,
            ]),
            'notes' => $adjustment->notes,
        ];
    }
}
