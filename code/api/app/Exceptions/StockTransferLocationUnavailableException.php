<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown at posting or reversal time when a Stock Transfer's source or
 * destination Location is no longer available for the move — soft-deleted, its
 * Operating Unit gone, or (posting only) inactive.
 */
class StockTransferLocationUnavailableException extends RuntimeException {}
