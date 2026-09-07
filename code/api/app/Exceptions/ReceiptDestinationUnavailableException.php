<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when posting a Receipt whose destination InventoryLocation is no longer
 * a valid receiving target — it was soft-deleted after the draft was created
 * (the location's delete endpoint permits this while it holds no stock), or it
 * was deactivated / had `can_receive_purchases` cleared while the Receipt sat as
 * a draft (#572). Posting must not create stock under a location the API can no
 * longer serialize, route to, or receive purchases into. Maps to HTTP 409.
 */
class ReceiptDestinationUnavailableException extends RuntimeException {}
