<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when posting or reversing a Receipt whose line references an
 * ItemVariant that was soft-deleted after the draft was created —
 * VariantPurchasePresentation::itemVariant() excludes trashed variants by
 * design (display resources already tolerate the resulting null), but a
 * mutation path must reject the operation explicitly instead of crashing on
 * a null itemVariant.
 */
class ReceiptVariantUnavailableException extends RuntimeException {}
