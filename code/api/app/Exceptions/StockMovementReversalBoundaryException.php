<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when reversing a posted StockMovement would drive a location's
 * on_hand below zero — the stock the movement originally added has already
 * been consumed past the point where the movement can be cleanly unwound.
 * The reversal is rejected atomically; no compensating movement is written.
 */
class StockMovementReversalBoundaryException extends RuntimeException {}
