<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown by InventoryEntryPostingService when the database rejected a
 * source-line movement INSERT as a duplicate (the partial UNIQUE index over
 * related_type / related_id / related_line_id / reason) but the already-posted
 * movement that caused the collision cannot be re-read afterwards. A rejected
 * duplicate implies a live POSTED row exists, so this is a "cannot happen"
 * consistency failure — surfaced with a dedicated type, and inside the
 * caller's transaction, so the whole operation rolls back with a diagnosable
 * cause rather than a generic runtime error.
 */
class InventoryEntryRecoveryException extends RuntimeException {}
