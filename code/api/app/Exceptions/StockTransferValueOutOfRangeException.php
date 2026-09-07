<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown at posting time when a derived monetary figure — the movement line
 * total (`source_unit_cost × base_quantity`) — would exceed the `decimal(15,4)`
 * range of the column it is written to. Individually valid inputs (a large but
 * in-range quantity, a modest unit cost) can still multiply out of range;
 * surfacing this as a controlled 409 keeps it off the PostgreSQL 500 path.
 */
class StockTransferValueOutOfRangeException extends RuntimeException {}
