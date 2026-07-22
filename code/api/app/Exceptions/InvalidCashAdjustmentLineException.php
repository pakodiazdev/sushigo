<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a cash adjustment or one of its lines fails business validation
 * (missing lines, missing tender type, non-positive amount, or a tender-specific
 * requirement such as card_terminal_id/bank_account_id not provided).
 */
class InvalidCashAdjustmentLineException extends RuntimeException {}
