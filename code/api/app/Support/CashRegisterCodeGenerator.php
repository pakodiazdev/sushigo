<?php

declare(strict_types=1);

namespace App\Support;

/**
 * {@see SequentialCodeGenerator} bound to the `cash_registers.code` column and
 * the `config/cash_registers.php` prefix/padding settings.
 *
 * The suffix is computed across every Cash Register regardless of branch,
 * operating unit, or register type (#498): the table's unique index on `code`
 * is global, so the suggestion namespace must be too.
 */
class CashRegisterCodeGenerator extends SequentialCodeGenerator
{
    public function __construct()
    {
        parent::__construct(
            table: 'cash_registers',
            column: 'code',
            prefix: (string) config('cash_registers.code_prefix'),
            padding: (int) config('cash_registers.code_padding'),
        );
    }
}
