<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Suggests an editable, unique-looking SKU for a new INSUMO/ACTIVO Item.
 *
 * Unlike {@see SequentialCodeGenerator}'s fixed-prefix entities (Employee #016,
 * Supplier #497), an Item SKU keeps a human-recognisable prefix derived from the
 * Item name — "Salmón fresco" -> `SAL-001`, a collision advances to `SAL-002`.
 * The numeric suffix search is delegated to {@see SequentialCodeGenerator} so
 * soft-deleted SKUs stay permanently occupied and the maximum suffix is computed
 * in SQL. See `config/items.php` for the derivation rules (#500).
 */
class ItemSkuGenerator
{
    private readonly string $prefix;

    private readonly SequentialCodeGenerator $sequence;

    public function __construct(?string $name)
    {
        $this->prefix = self::derivePrefix($name);
        $this->sequence = new SequentialCodeGenerator(
            table: 'items',
            column: 'sku',
            prefix: $this->prefix,
            padding: (int) config('items.sku.padding'),
        );
    }

    /**
     * The contextual prefix, separator included (e.g. `SAL-`).
     */
    public function prefix(): string
    {
        return $this->prefix;
    }

    /**
     * The next unused `<prefix><zero-padded number>` SKU for this context.
     */
    public function next(): string
    {
        return $this->sequence->next();
    }

    /**
     * Deterministic name -> prefix derivation. Documented in `config/items.php`.
     */
    public static function derivePrefix(?string $name): string
    {
        $length = (int) config('items.sku.prefix_length');
        $separator = (string) config('items.sku.separator');
        $fallback = (string) config('items.sku.fallback_prefix');

        $normalized = Str::of($name ?? '')
            ->ascii()
            ->replaceMatches('/[^A-Za-z0-9]/', '')
            ->upper()
            ->toString();

        $stem = mb_substr($normalized, 0, $length);

        if (mb_strlen($stem) < $length) {
            $stem = $fallback;
        }

        return $stem.$separator;
    }
}
