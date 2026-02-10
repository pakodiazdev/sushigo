# ✅ MVP Scope — Attendance & Payroll (SushiGo)

**MVP goal:**  
By the end of the week, the system must produce the **total amount to pay per employee** with a **clear, auditable breakdown**, considering attendance, lateness, **partial leave (paid/unpaid)**, >30 min late deductions, punctuality bonuses, negotiated extra days, and overtime (paid only if authorized).

---

## 1) Main deliverable

At pay-period close (week), the system must output:

- **Total to pay per employee**
- **Breakdown** by concept:
  - Period base pay
  - Deductions for unworked minutes (>30 min late) and **unpaid partial leave**
  - Paid overtime (if authorized)
  - Negotiated extra-day pay (if any)
  - Punctuality bonus (if any)
- **Daily evidence** (table):
  - check-in, check-out
  - lunch timestamps (at least lunch return)
  - day status
  - late minutes and deducted minutes
  - partial leave events (type, paid/unpaid, minutes)
  - overtime exists and whether it was paid
- **Snapshot/Close**: results are frozen and remain viewable.

---

## 2) Included functionality (MVP)

### 2.1 Employees
- Create/update basic employee data.
- Assign role (Manager/Cook/Kitchen Assistant/Delivery Driver).
- Enable/disable employee.

### 2.2 Schedule (basis for punctuality)
- Per-employee, day-by-day schedule configuration:
  - **Expected start time**
  - **Expected lunch return time** (or scheduled lunch end)
  - Expected end time (ideal for overtime)
  - Days off
- View current schedule.

### 2.3 Daily attendance capture
- “Today” view:
  - employee list
  - quick **check-in** capture
- Capture **lunch return** (minimum).
- Capture **check-out** to close the day and compute overtime.
- Editing:
  - Manager edits only current day
  - Admin edits historical days (with audit)

### 2.4 Partial leave (paid / unpaid)
Record partial leave when an employee:
- **arrives late** (by permission),
- **leaves early**, or
- **takes time** during the shift.

Each event must include:
- **paid** or **unpaid**
- time window (start/end) or duration in minutes
- reason and approved_by

Rules:
- **Unpaid:** deduct **minute by minute** the exact time taken (never more, never less).
- **Paid:** no payroll impact, store historical record only.

### 2.5 Day status
Per employee/date:
- worked (normal)
- day off
- absence
- negotiated extra day

### 2.6 Late deduction rule (>30 min) — entry and lunch return
If the employee is **more than 30 minutes late**:
- deduct the **exact** late minutes from pay
- **minute not worked = minute not paid**

Applies to:
- check-in vs expected start time
- lunch return vs expected lunch return time

### 2.7 Punctuality bonus — based on “N minutes late”
Computed against the employee’s **expected time** from schedule.

Ranges (seconds precision):
- **0:00 to 9:59** → **100%**
- **10:00 to 14:59** → **50%**
- **15:00 to 20:59** → **25%**
- **21:00 to 25:59** → **10%**
- **26:00+** → **0%**

Weekly base bonus and proration:
- $110/$100 ÷ 6 working days
- $50 ÷ 3 working days

Does not apply on:
- days off
- absences
- negotiated extra day

MVP exception:
- allow forcing 0% by employee/days (e.g., Andrea Tue/Wed/Thu)

### 2.8 Negotiated extra day (no bonus)
Record an “Extra Day”:
- date
- employee
- agreed pay
- approved by Manager/Admin

That day:
- **is paid**
- **does not apply** to punctuality bonus
- **does not count** for proportional rest

### 2.9 Overtime (paid only if authorized)
At **check-out**, Manager must choose:
- “Pay overtime: Yes/No”

If **Yes**:
- pay using configured valuation:
  - wage-proportional (LFT) or agreed hourly rate (employee config)
- store history: method, rate, amount, who/when authorized

If **No**:
- keep as **historical record** (no balance accumulation)

### 2.10 Weekly close (snapshot)
- Weekly close preview (totals + breakdown)
- “Close week”:
  - snapshot and freeze
  - prevents edits (except Admin with audit)

---

## 3) MVP reports (minimum)
- **Today**: employee list and status (arrived/not arrived/late).
- **Weekly summary per employee**:
  - total to pay
  - breakdown
  - daily evidence table
