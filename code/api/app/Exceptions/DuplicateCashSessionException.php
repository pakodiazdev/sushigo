<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when attempting to open a CashSession for a register/date that
 * already has one.
 */
class DuplicateCashSessionException extends RuntimeException {}
