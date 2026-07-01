<?php

namespace App\Enums;

enum TerminationType: string
{
    case Resignation = 'resignation';
    case Dismissal = 'dismissal';
    case ContractEnd = 'contract_end';
    case InternalTransfer = 'internal_transfer';
    case Other = 'other';

    public function resetsSeniority(): bool
    {
        return $this !== self::InternalTransfer;
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
