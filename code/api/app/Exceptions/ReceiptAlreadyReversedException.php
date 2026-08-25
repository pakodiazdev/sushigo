<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when an operation (post or reverse) is attempted on a Receipt that
 * has already been reversed.
 */
class ReceiptAlreadyReversedException extends RuntimeException {}
