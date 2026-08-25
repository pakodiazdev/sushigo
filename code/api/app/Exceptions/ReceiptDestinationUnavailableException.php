<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when posting a Receipt whose destination InventoryLocation was
 * soft-deleted after the draft was created — the location's delete endpoint
 * permits this while it holds no stock, but posting must not create stock
 * under a location the API can no longer serialize or route to.
 */
class ReceiptDestinationUnavailableException extends RuntimeException {}
