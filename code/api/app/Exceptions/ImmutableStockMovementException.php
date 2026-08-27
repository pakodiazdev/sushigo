<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when code attempts to edit or delete a POSTED (or already REVERSED)
 * StockMovement or one of its lines. Posted stock history is append-only: the
 * only legal change to a posted movement is the POSTED -> REVERSED transition
 * performed by the compensating-reversal workflow, and corrections are made by
 * posting a new compensating movement, never by mutating the original.
 */
class ImmutableStockMovementException extends RuntimeException {}
