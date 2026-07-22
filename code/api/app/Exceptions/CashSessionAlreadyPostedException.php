<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when an operation is attempted on a CashSession that has already
 * been posted and is therefore immutable.
 */
class CashSessionAlreadyPostedException extends RuntimeException {}
