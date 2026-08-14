<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a Stock mutation would violate the nonnegative on_hand/reserved
 * invariant, or leave reserved greater than on_hand. Rejected at the
 * application layer before the database CHECK constraint is ever reached, so
 * this fires for any caller — HTTP or otherwise.
 */
class InvalidStockBalanceException extends RuntimeException {}
