<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a posted Stock Transfer cannot be reversed because the
 * destination Stock it added has since fallen below the transferred quantity —
 * compensating would drive the destination balance negative. Mirrors
 * `StockMovementReversalBoundaryException`, reusing Stock's own guarded
 * decrement invariant rather than inventing a new rule.
 */
class StockTransferReversalBoundaryException extends RuntimeException {}
