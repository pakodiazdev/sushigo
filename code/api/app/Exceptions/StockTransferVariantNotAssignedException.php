<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown at posting time when a moved Variant is not assigned to the
 * destination Location. An internal move never silently expands the destination
 * assortment (#569) — the operator must assign the Variant there first.
 */
class StockTransferVariantNotAssignedException extends RuntimeException {}
