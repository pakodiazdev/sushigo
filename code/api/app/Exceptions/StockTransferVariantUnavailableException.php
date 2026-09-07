<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a draft Stock Transfer references an ItemVariant that was
 * deactivated or soft-deleted before the transfer was posted.
 */
class StockTransferVariantUnavailableException extends RuntimeException {}
