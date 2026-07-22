<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when an operation (post/delete) is attempted on a CashAdjustment
 * that has already been posted and is therefore immutable.
 */
class CashAdjustmentAlreadyPostedException extends RuntimeException {}
