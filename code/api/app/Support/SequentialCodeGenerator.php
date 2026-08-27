<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Suggests the next unused `<prefix><zero-padded number>` code for a table column,
 * computing the current maximum numeric suffix in SQL so no rows are loaded into PHP.
 *
 * Soft-deleted rows are considered occupied: the query goes through the query builder
 * (no model scope), so a historical code is never re-proposed even when a partial
 * unique index would technically allow its reuse.
 *
 * Introduced for Supplier codes (#497); reusable by later sequential-code entities
 * such as Cash Registers (#498).
 */
class SequentialCodeGenerator
{
    public function __construct(
        private readonly string $table,
        private readonly string $column,
        private readonly string $prefix,
        private readonly int $padding,
    ) {}

    public function prefix(): string
    {
        return $this->prefix;
    }

    public function format(int $number): string
    {
        return $this->prefix.str_pad((string) $number, $this->padding, '0', STR_PAD_LEFT);
    }

    public function next(): string
    {
        return $this->format($this->nextNumber());
    }

    private function nextNumber(): int
    {
        $suffixStart = strlen($this->prefix) + 1;
        $column = $this->column;

        // `?::int` is required: PDO binds the position as text, and `substring(text, text)`
        // resolves to the POSIX-regex form (wrong result) instead of the positional one.
        // `{1,15}` keeps the matched suffix inside bigint range so an oversized code
        // (the column allows long values) is ignored as non-sequential rather than
        // overflowing the cast and failing every call with a 500.
        $maxNumber = DB::table($this->table)
            ->where($column, 'like', $this->prefix.'%')
            ->whereRaw("substring({$column}, ?::int) ~ '^[0-9]{1,15}\$'", [$suffixStart])
            ->selectRaw("max(cast(substring({$column}, ?::int) as bigint)) as max_number", [$suffixStart])
            ->value('max_number');

        $candidate = ((int) ($maxNumber ?? 0)) + 1;

        while ($this->codeExists($this->format($candidate))) {
            $candidate++;
        }

        return $candidate;
    }

    private function codeExists(string $code): bool
    {
        return DB::table($this->table)->where($this->column, $code)->exists();
    }
}
