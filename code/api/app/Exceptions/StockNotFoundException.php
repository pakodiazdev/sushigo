<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a stock-out is requested for an item variant/location that
 * has no Stock record.
 */
class StockNotFoundException extends RuntimeException {}
