<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a stock-out requests more quantity than is currently
 * available (on_hand - reserved) at the location.
 */
class InsufficientStockException extends RuntimeException {}
