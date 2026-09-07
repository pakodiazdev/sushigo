<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown at posting time when the source Location does not hold enough
 * unreserved quantity of a Variant to cover the line's base quantity.
 */
class StockTransferInsufficientStockException extends RuntimeException {}
