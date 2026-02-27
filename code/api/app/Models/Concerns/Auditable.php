<?php

namespace App\Models\Concerns;

use App\Enums\AuditAction;
use App\Models\AttendanceAuditLog;
use Illuminate\Support\Facades\Auth;

/**
 * Automatically logs CREATE, UPDATE, and DELETE events to attendance_audit_logs.
 *
 * Apply this trait to any attendance-domain model that requires a full audit trail
 * of mutations (RF-19). The log captures who made the change, what changed, and
 * an optional justification reason.
 *
 * Usage:
 *   use App\Models\Concerns\Auditable;
 *
 *   class Attendance extends Model
 *   {
 *       use Auditable;
 *   }
 *
 * The trait hooks into three Eloquent model events:
 *   - created  → AuditAction::CREATE, new_values = all current attributes
 *   - updated  → AuditAction::UPDATE, old_values = dirty original, new_values = changes only
 *   - deleted  → AuditAction::DELETE, old_values = all attributes at time of deletion
 *
 * For UPDATE, only changed fields are recorded to keep diffs minimal and readable.
 *
 * The `reason` field is optional and is sourced from a transient property
 * `$auditReason` that callers can set before saving:
 *
 *   $attendance->auditReason = 'Admin correction for past date';
 *   $attendance->save();
 *
 * @see AP-065
 */
trait Auditable
{
    /**
     * Optional reason for the current mutation — set by callers before save/delete.
     * Not persisted on the model itself; consumed once and cleared after logging.
     */
    public ?string $auditReason = null;

    public static function bootAuditable(): void
    {
        static::created(function (self $model): void {
            $model->writeAuditLog(
                action:    AuditAction::CREATE,
                oldValues: null,
                newValues: $model->getAuditAttributes(),
            );
        });

        static::updated(function (self $model): void {
            $dirty = $model->getDirty();

            // Nothing worth logging if no tracked fields changed
            if (empty($dirty)) {
                return;
            }

            $original = array_intersect_key($model->getOriginal(), $dirty);

            $model->writeAuditLog(
                action:    AuditAction::UPDATE,
                oldValues: $model->castAuditValues($original),
                newValues: $model->castAuditValues($dirty),
            );
        });

        static::deleted(function (self $model): void {
            $model->writeAuditLog(
                action:    AuditAction::DELETE,
                oldValues: $model->getAuditAttributes(),
                newValues: null,
            );
        });
    }

    private function writeAuditLog(
        AuditAction $action,
        ?array      $oldValues,
        ?array      $newValues,
    ): void {
        AttendanceAuditLog::create([
            'auditable_type' => static::class,
            'auditable_id'   => $this->getKey(),
            'action'         => $action,
            'old_values'     => $oldValues,
            'new_values'     => $newValues,
            'user_id'        => Auth::id(),
            'reason'         => $this->auditReason,
        ]);

        // Clear the reason after consuming it — it is single-use per mutation.
        $this->auditReason = null;
    }

    /**
     * Return all model attributes excluding internal timestamps and primary key,
     * with enum values resolved to their string representation for storage.
     */
    private function getAuditAttributes(): array
    {
        $excluded = ['id', 'created_at', 'updated_at', 'deleted_at'];

        $attributes = array_diff_key($this->getAttributes(), array_flip($excluded));

        return $this->castAuditValues($attributes);
    }

    /**
     * Convert raw DB values to JSON-safe representations.
     * Enum-backed instances are resolved to their string value.
     */
    private function castAuditValues(array $values): array
    {
        return collect($values)
            ->map(fn ($value) => $value instanceof BackedEnum ? $value->value : $value)
            ->all();
    }
}
