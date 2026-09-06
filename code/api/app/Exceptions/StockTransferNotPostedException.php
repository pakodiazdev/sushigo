<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a reversal is requested for a Stock Transfer that was never
 * posted (still a DRAFT) — there is nothing to compensate.
 */
class StockTransferNotPostedException extends RuntimeException {}
