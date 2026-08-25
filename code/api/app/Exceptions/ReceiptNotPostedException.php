<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when reversal is attempted on a Receipt that is still a draft
 * (nothing was ever posted to Stock, so there is nothing to reverse).
 */
class ReceiptNotPostedException extends RuntimeException {}
