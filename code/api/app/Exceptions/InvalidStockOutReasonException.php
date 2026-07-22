<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a stock-out is requested with a reason other than SALE or
 * CONSUMPTION.
 */
class InvalidStockOutReasonException extends RuntimeException {}
