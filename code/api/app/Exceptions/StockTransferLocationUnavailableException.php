<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown at posting time when a Stock Transfer's source or destination Location
 * is no longer available for the move — soft-deleted, inactive, or otherwise
 * not a valid stock-holding endpoint.
 */
class StockTransferLocationUnavailableException extends RuntimeException {}
