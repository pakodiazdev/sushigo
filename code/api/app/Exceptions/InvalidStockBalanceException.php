<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a Stock mutation would violate the nonnegative on_hand/reserved
 * invariant, leave reserved greater than on_hand, or overflow the quantity
 * column. Rejected at the application layer before the database constraint is
 * ever reached, so this fires for any caller — HTTP or otherwise.
 */
class InvalidStockBalanceException extends RuntimeException {}
