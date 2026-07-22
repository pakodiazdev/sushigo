<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when no active UomConversion (direct or inverse) exists between
 * the entry/transaction UOM and the item variant's base UOM.
 */
class UomConversionNotFoundException extends RuntimeException {}
