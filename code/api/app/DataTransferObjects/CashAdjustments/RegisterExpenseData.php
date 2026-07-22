<?php

namespace App\DataTransferObjects\CashAdjustments;

use App\Models\CashSession;
use App\Models\User;

final readonly class RegisterExpenseData
{
    public function __construct(
        public CashSession $session,
        public string $tenderType,
        public float $amount,
        public string $category,
        public ?string $vendor,
        public ?string $reference,
        public ?string $notes,
        public ?int $cardTerminalId,
        public ?int $bankAccountId,
        public User $createdBy,
        public ?string $incurredAt = null,
        public array $meta = [],
    ) {}
}
