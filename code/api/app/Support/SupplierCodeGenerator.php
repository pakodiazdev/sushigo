<?php

declare(strict_types=1);

namespace App\Support;

/**
 * {@see SequentialCodeGenerator} bound to the `suppliers.code` column and the
 * `config/suppliers.php` prefix/padding settings.
 */
class SupplierCodeGenerator extends SequentialCodeGenerator
{
    public function __construct()
    {
        parent::__construct(
            table: 'suppliers',
            column: 'code',
            prefix: (string) config('suppliers.code_prefix'),
            padding: (int) config('suppliers.code_padding'),
        );
    }
}
