<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when an operation (post/update/delete) is attempted on a CashExpense
 * that has already been posted and is therefore immutable.
 */
class CashExpenseAlreadyPostedException extends RuntimeException {}
