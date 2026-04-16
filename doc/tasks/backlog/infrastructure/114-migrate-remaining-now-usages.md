# 114 - Migrate Remaining now() Usages to ApplicationClock

**Type:** 🔧 Maintenance / Tech Debt  
**Priority:** Medium  
**Depends on:** #113 (Application Clock Source of Truth)  
**Detected by:** `scripts/lint-clock-usage.sh`

---

## 📋 Description

Task #113 established the Application Clock as the source of truth for business time. However, the codebase still contains direct `now()` / `new Date()` usages that should be migrated to use the injected `ApplicationClock` for consistent time simulation and testing.

This task tracks the incremental migration of these usages.

---

## 🔍 Backend Violations (PHP)

All usages below use `now()` directly instead of `$clock->nowUtc()`:

### Leaves Module (3 usages)

| File | Line | Code | Analysis |
|------|------|------|----------|
| `app/Actions/Leaves/ApproveLeaveAction.php` | 48 | `'approved_at' => now()` | **Business timestamp** - needs clock injection |
| `app/Actions/Leaves/RegisterDirectLeaveAction.php` | 41 | `$attributes['approved_at'] = now()` | **Business timestamp** - needs clock injection |
| `app/Actions/Leaves/RejectLeaveAction.php` | 36 | `'approved_at' => now()` | **Business timestamp** - needs clock injection |

### Cash Adjustments Module (3 usages)

| File | Line | Code | Analysis |
|------|------|------|----------|
| `app/Services/CashAdjustments/CashAdjustmentService.php` | 120 | `$adjustment->posted_at = now()` | **Business timestamp** - needs clock injection |
| `app/Services/CashAdjustments/CashExpenseService.php` | 47 | `'incurred_at' => $incurredAt ?? now()` | **Business timestamp** - needs clock injection |
| `app/Services/CashAdjustments/CashExpenseService.php` | 65 | `$expense->posted_at = now()` | **Business timestamp** - needs clock injection |

### Inventory Module (2 usages)

| File | Line | Code | Analysis |
|------|------|------|----------|
| `app/Services/Inventory/OpeningBalanceService.php` | 100 | `'posted_at' => now()` | **Business timestamp** - needs clock injection |
| `app/Services/Inventory/StockOutService.php` | 137 | `'posted_at' => now()` | **Business timestamp** - needs clock injection |

---

## 🔍 Frontend Violations (TypeScript)

### Date.now() usages

| File | Line | Code | Analysis |
|------|------|------|----------|
| `src/components/attendance/EmployeeAttendanceCard.tsx` | 181-184 | `nowMs = Date.now()` in `LeaveChip` | **Already injectable** - uses prop for tests ✅ |
| `src/components/dev/use-dev-debugger.ts` | 203 | `Date.now() - 5000` for fresh queries | **Infrastructure** - OK for debugger ✅ |

### new Date() usages requiring review

| File | Line | Code | Analysis |
|------|------|------|----------|
| `src/components/employees/use-override-scope-dialog.ts` | 13 | `const today = new Date()` | **Business logic** - needs `todayDateCdmx()` |
| `src/components/employees/use-wage-form.ts` | 30 | `new Date().toISOString().split('T')[0]` | **Business default** - needs `todayDateCdmx()` |
| `src/components/employees/use-weekly-calendar.ts` | 103 | `getWeekStart(new Date())` | **UI display** - acceptable for calendar navigation |
| `src/components/employees/use-rehire-form.ts` | 33 | `new Date().toISOString().slice(0, 10)` | **Business default** - needs `todayDateCdmx()` |
| `src/components/employees/use-deactivate-form.ts` | 32 | `new Date().toISOString().slice(0, 10)` | **Business default** - needs `todayDateCdmx()` |
| `src/components/employees/use-leave-summary-section.ts` | 13 | `const now = new Date()` | **Business logic** - needs clock store |
| `src/components/employees/use-schedule-content.ts` | 27 | `const d = new Date()` | **Business logic** - needs `todayDateCdmx()` |

### Allowed usages (no action needed)

- `src/lib/datetime.ts` - centralized resolver (allowed)
- `src/lib/timezone.ts` - centralized resolver (allowed)
- `src/stores/clock.store.ts` - clock store internals (allowed)
- Test files (`__tests__/`) - test-specific (allowed)

---

## ✅ Migration Pattern

### Backend

```php
// Before
class ApproveLeaveAction
{
    public function execute(Leave $leave): void
    {
        $leave->update(['approved_at' => now()]);
    }
}

// After
use App\Support\Clock\ApplicationClock;

class ApproveLeaveAction
{
    public function __construct(
        private readonly ApplicationClock $clock,
    ) {}

    public function execute(Leave $leave): void
    {
        $leave->update(['approved_at' => $this->clock->nowUtc()]);
    }
}
```

### Frontend

```typescript
// Before
const today = new Date().toISOString().slice(0, 10)

// After
import { todayDateCdmx } from '@/lib/datetime'

const today = todayDateCdmx()
```

---

## 📊 Scope Summary

| Category | Count | Priority |
|----------|-------|----------|
| Backend - Leaves | 3 | High (business decisions) |
| Backend - Cash | 3 | High (financial timestamps) |
| Backend - Inventory | 2 | High (stock movements) |
| Frontend - Forms | 5 | Medium (default values) |
| Frontend - Display | 1 | Low (calendar UI) |

**Total violations requiring action:** 14

---

## 🎯 Acceptance Criteria

- [ ] All backend Actions/Services inject `ApplicationClock` instead of using `now()` directly
- [ ] All frontend business logic uses `todayDateCdmx()` from `@/lib/datetime`
- [ ] `scripts/lint-clock-usage.sh` passes with 0 violations
- [ ] Tests updated to use deterministic clock values

---

## 🔗 References

- Parent task: [#113 - Application Clock Source of Truth](../2026-04/113-application-clock-source-of-truth.md)
- Conventions: `doc/conventions/backend/application-clock.md`
- Conventions: `doc/conventions/frontend/application-clock.md`
- Lint script: `scripts/lint-clock-usage.sh`
