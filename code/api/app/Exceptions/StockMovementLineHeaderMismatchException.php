<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a stock_movement_lines row's item_variant_id or base_qty
 * disagrees with its parent StockMovement header's item_variant_id/qty,
 * before the #575 migration drops those now-redundant columns.
 */
class StockMovementLineHeaderMismatchException extends RuntimeException {}
