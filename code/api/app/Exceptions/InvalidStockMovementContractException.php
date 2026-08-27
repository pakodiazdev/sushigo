<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a StockMovement (or its line) violates the normalized contract
 * invariants before it is persisted: a non-positive quantity, a line that
 * disagrees with the header on variant or quantity, an invalid
 * reason/source/destination combination, or an illegal status transition.
 * Raised at the application layer inside the caller's transaction, so the
 * whole operation rolls back atomically.
 */
class InvalidStockMovementContractException extends RuntimeException {}
