<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a reversal is requested for a StockMovement that is not in a
 * reversible state: it was never posted (still DRAFT), it has already been
 * reversed, or it is itself a compensating reversal movement.
 */
class StockMovementNotReversibleException extends RuntimeException {}
