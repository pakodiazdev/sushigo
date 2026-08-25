<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when posting is attempted on a Receipt that is not in draft status
 * (already posted or reversed) — guards against duplicate/concurrent posting.
 */
class ReceiptAlreadyPostedException extends RuntimeException {}
