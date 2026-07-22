<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a cash expense fails business validation (non-positive amount,
 * or a tender-specific requirement such as card_terminal_id/bank_account_id
 * not provided).
 */
class InvalidCashExpenseException extends RuntimeException {}
