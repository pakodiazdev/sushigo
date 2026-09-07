<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a Stock Transfer that has already been REVERSED is posted or
 * reversed again.
 */
class StockTransferAlreadyReversedException extends RuntimeException {}
