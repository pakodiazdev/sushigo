<?php

namespace App\Exceptions\Money;

use InvalidArgumentException;

/**
 * Thrown when a `Money` or `Decimal` value (#415, per TD-05) is constructed from a value
 * that cannot represent an exact fixed-point amount — a non-numeric string, a value with
 * more fractional digits than the target scale allows, mismatched currencies in an
 * arithmetic operation, or any other violation of the exact-decimal contract. Never thrown
 * for a plain `float` argument — PHP itself rejects that at the type level (see `Money`'s
 * and `Decimal`'s class docblocks) before this exception's checks ever run.
 */
class InvalidMoneyValueException extends InvalidArgumentException {}
