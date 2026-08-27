<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Item SKU Suggestion — Contextual Prefix
    |--------------------------------------------------------------------------
    |
    | When creating an INSUMO/ACTIVO Item, the API suggests an editable SKU
    | whose prefix is derived from the Item name. The derivation is
    | deterministic:
    |
    |   1. Transliterate the name to ASCII (Unicode accents folded: "ó" -> "o").
    |   2. Remove every character that is not a letter or digit
    |      (punctuation and whitespace included).
    |   3. Uppercase the result.
    |   4. Take the first `prefix_length` characters as the prefix.
    |   5. If fewer than `prefix_length` alphanumeric characters remain, use
    |      `fallback_prefix` instead.
    |   6. Append `separator`, then a zero-padded consecutive number
    |      (`padding` digits, wider when the sequence outgrows it).
    |
    | Examples with the defaults below:
    |   "Salmón fresco" -> SAL-001    "Refrigerador" -> REF-001
    |   "Té"            -> ITEM-001   "!!! ---"      -> ITEM-001
    |
    */

    'sku' => [
        'prefix_length' => (int) env('ITEM_SKU_PREFIX_LENGTH', 3),
        'separator' => env('ITEM_SKU_SEPARATOR', '-'),
        'padding' => (int) env('ITEM_SKU_PADDING', 3),
        'fallback_prefix' => env('ITEM_SKU_FALLBACK_PREFIX', 'ITEM'),
    ],

];
