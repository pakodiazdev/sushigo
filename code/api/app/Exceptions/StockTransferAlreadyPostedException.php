<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a mutation (edit / delete / post) is attempted on a Stock
 * Transfer that is already POSTED — guards against duplicate/concurrent posting
 * and editing frozen history.
 */
class StockTransferAlreadyPostedException extends RuntimeException {}
