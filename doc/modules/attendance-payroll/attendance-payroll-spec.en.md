# 📋 Attendance, Punctuality, and Weekly Payroll Close Module  
## SushiGo

**Version:** 0.8 (narrative + specification)  
**Date:** 2026-02-09  
**Base:** original module draft fileciteturn1file0  

---

## 1) The problem we want to solve (human-friendly)

At SushiGo we need a **clear and fair** way to track:

- **Who came to work**
- **What time they arrived** (punctuality / lateness)
- **When they worked negotiated extra days**
- **How many overtime hours they earned**
- **Which leaves and vacations they had**
- **Which days were holidays**

The goal is that **at the end of the week** we can obtain:

1) The **total amount to pay per employee**  
2) A **breakdown** that explains where that total came from (base pay + bonuses + extras − adjustments)  
3) Operational evidence (attendance logs, lateness, approvals)

This matters because in real operations:
- If there is no record, it becomes an argument (“who did come”, “who was late”, etc.).
- If there are no rules, the system feels unfair or easy to manipulate.
- If there is no close (freeze), numbers change later and nobody trusts them.

---

## 2) How it works in practice (operational flow)

### 2.1 Day-to-day operation
1) The **Manager** opens the **“Today”** view.
2) They record each employee’s **arrival time (check-in)**.
3) (Ideally) At the end of the workday they record the **departure time (check-out)**.
   - If there were **overtime hours**, the Manager must decide right then whether **they will be paid** (manual authorization).
   - If payment is **not** authorized, overtime remains as **historical record** (it does not accumulate as a balance).
4) If someone did not work or needs partial time away:
   - they are marked as **day off**, **leave**, **vacation**, or **absence**.
   - For **partial leave** (arrive late, leave early, or take time), the event must be recorded and flagged as **paid** or **unpaid**.
5) If someone worked an **additional negotiated day**:
   - it is recorded as an **Extra Day**, with its agreed payment.
   - that day **does not participate** in the punctuality bonus.
6) If someone worked beyond their schedule:
   - **overtime hours earned** are recorded, which can be accumulated or paid.

7) If someone arrives **more than 30 minutes late** (at check-in or returning from lunch):
   - the exact number of late minutes is deducted from pay (**minute not worked = minute not paid**).

### 2.2 Weekly close (SushiGo)
At the end of the week:
1) The system generates the **weekly summary** per employee.
2) The **total to pay** is calculated.
3) A **close** is performed (snapshot/freeze) so the period is “frozen”.

> If there are corrections after the close, they must be audited and controlled.

---

## 3) Punctuality rules (SushiGo bonus)

Punctuality is computed against the employee’s **expected start time** (configured in their **day-by-day schedule**).

- **lateness = actual_arrival - expected_time**
- If lateness <= 0 → lateness = 0
- Evaluation is done in **minutes with seconds precision**.
  - Example: if expected time is 13:00:00, arriving at 13:09:59 is still inside the first range.

### Bonus ranges by lateness
- **0:00 to 9:59** minutes late → **100%**
- **10:00 to 14:59** → **50%**
- **15:00 to 20:59** → **25%**
- **21:00 to 25:59** → **10%**
- **26:00+** → **0%**

### Weekly base bonus (SushiGo)
- $110 group (e.g., Angela, Adonais, Moni)
- $100 group (everyone else, except Samantha)
- Samantha $50

**Daily calculation**
- $110 and $100 are divided by **6 working days**
- $50 is divided by **3 working days**

**Important**
- Empty days (day off) → **no bonus**
- **Negotiated extra day** → the extra day **is paid**, but **does not apply** to punctuality bonuses
- Special case (real example): **Andrea** Tue/Wed/Thu = **0%** (configurable per employee/period)

---

## 4) Negotiated extra days (when it “shouldn’t happen” but it does)

Normally an employee works their standard week (for example, 6 days).  
If a 7th day appears, in SushiGo we treat it as:

- **Negotiated extra day**
- It has an **agreed payment** (fixed amount or multiplier)
- **Does not count** for the punctuality bonus
- **Does not count** for proportional rest
- It must be **approved** (Manager/Admin) so it isn’t ambiguous

Example: nephews on vacation who come help.

---

## 5) Overtime bank (control of overtime hours earned)

In addition to extra days, sometimes employees earn **overtime hours** (staying longer).  
We need to keep track because those hours can:

- Be paid at the close,
- Be accumulated for later,
- Be exchanged for time off,

as defined by SushiGo or by configuration.

To make the bank reliable, each movement must record:
- date, minutes, type (earned/used/paid/adjustment), origin (auto/manual), and approval when applicable.

---

# PART B — TECHNICAL SPECIFICATION (RF / RN / DC)

> This section is the basis to implement backend/frontend, tests, and reports.

---

## 7) Roles (SushiGo: roles are aligned)

Employee roles (operational and access):
- **Manager**
- **Cook**
- **Kitchen Assistant**
- **Delivery Driver**

Special permission:
- **Admin** (historical edits, catalogs, overrides)

---

## 8) Glossary

- **Employment period:** contracted interval (can include re-hires).
- **Pay period (close):** time range used to calculate pay.
- **Schedule:** entry/lunch/exit times per day.
- **Attendance:** check-in/out (and optional lunch).
- **Day status:** worked/day off/leave/vacation/holiday/absence/extra.
- **Partial leave:** time-based event (arrive late, leave early, or take time) flagged as paid or unpaid.
- **Negotiated extra day:** agreed additional day (does not apply for bonuses).
- **Overtime (bank):** extra time earned (and its usage or payment).

---

## 9) Functional Requirements (RF)

### 9.1 Employees and account
- **RF-01:** Register employees (general data).
- **RF-02:** Role: Manager/Cook/Kitchen Assistant/Delivery Driver.
- **RF-03:** Branch per period.
- **RF-04:** Employee can view history (attendance, bonuses, overtime, vacations).

### 9.2 Employment periods
- **RF-05:** Register multiple employment periods per employee (re-hires).
- **RF-06:** Only one active employment period at a time.
- **RF-07:** Viewable history.

### 9.3 Schedules
- **RF-08:** Define schedule per day (entry, lunch, exit, day-offs).
- **RF-09:** Version schedules and attach to employment periods.

### 9.4 Workday type
- **RF-10:** Full schedule (6d/8h) or partial (variable).

### 9.5 Attendance
- **RF-11:** Register check-in per employee/date.
- **RF-12:** Register check-out per employee/date.
- **RF-13:** Calculate late minutes vs scheduled time.
- **RF-14:** Calculate net worked hours (subtracting lunch if applicable).
- **RF-15:** Suggest preliminary day status.

- **RF-15a:** The system must calculate **late minutes** for:
  - **Entry** (check-in vs scheduled time)
  - **Return from lunch** (actual lunch end vs scheduled lunch end)
- **RF-15b:** If lateness is **greater than 30 minutes**, the system must automatically create a **pay adjustment** for the **unworked minutes** (minute not paid), without any additional sanction.

### 9.6 Day status
- **RF-16:** Each employee/date must have a status:
  - worked / day off / leave / vacation / holiday / absence / extra

### 9.7 Editing, audit, and close
- **RF-17:** Manager edits only the current day.
- **RF-18:** Past days are Admin-only.
- **RF-19:** Minimal audit log for historical changes (who/when/before/after).
- **RF-20:** Pay-period close (freeze) with a calculation snapshot.
- **RF-21:** Reopen/recalculate only with permissions and audit.

### 9.8 Wage per period
- **RF-22:** Daily wage with effective date (raise history).
- **RF-23:** The close uses the wage effective in the period.

### 9.9 Leaves (paid / unpaid)
- **RF-24:** Leave catalog with:
  - paid/unpaid
  - leave type (partial or full-day/range)
  - whether it generates proportional rest
  - whether it counts toward bonus (recommended flag)
- **RF-25:** Register leave by date or range.
- **RF-25a (Partial leave):** Record partial leave per employee/date with:
  - type: **arrive late** | **leave early** | **take time**
  - time window (start/end) or duration in minutes
  - **paid** or **unpaid**
  - reason and approved_by
- **RF-25b (Unpaid calculation):** If the leave is **unpaid**, deduct pay for **exactly** the time taken **minute by minute** (never more, never less).
- **RF-25c (Paid calculation):** If the leave is **paid**, keep only the historical event record and **do not** affect payroll.

### 9.10 Vacations
- **RF-26:** Manage vacation balance per LFT (MX).
- **RF-27:** Request and approval.
- **RF-28:** Block normal capture on approved vacation days (unless Admin override).

### 9.11 Holidays
- **RF-29:** Holiday catalog.
- **RF-30:** Multiplier normal/double/triple.
- **RF-31:** Determine pay based on status (worked/not worked).

### 9.12 Punctuality, lateness, and bonuses
- **RF-32:** Configure punctuality ranges → percentage.
- **RF-33:** Configure weekly base bonus per employee/group.
- **RF-34:** Prorate weekly bonus to daily bonus by working days.
- **RF-35:** Exclude day-offs (empty cells) from bonus.
- **RF-36:** Calculate “free hours” benefit from punctual weeks.
- **RF-37:** Support per-employee/per-period exceptions (e.g., Andrea Tue/Wed/Thu = 0%).

### 9.13 Negotiated extra days
- **RF-38:** Record a day as **Extra** for an employee/date.
- **RF-39:** Extra stores: employee, date, branch, agreed pay, approval, notes.
- **RF-40:** Extra does not apply to punctuality bonus or free hours.
- **RF-41:** The close adds the extra-day pay to the total.

### 9.14 Overtime bank
- **RF-42:** Track overtime hours earned per employee.
- **RF-43:** Overtime can be generated by:
  - (a) automatic: worked hours > scheduled hours
  - (b) manual, authorized
- **RF-44:** Movements: EARNED | USED | PAID | ADJUSTMENT
- **RF-45:** Each movement records: date, minutes, origin, reference, approval, reason.
- **RF-46:** Show balance and history.
- **RF-47:** At close, overtime is **paid only** if the Manager **authorized** it; otherwise it remains **historical**.

- **RF-47a (Pay authorization):** Paying overtime requires **explicit Manager authorization**. Authorization occurs when **recording check-out** or confirming the day close.
- **RF-47b (Pay record):** When overtime is paid, the system must record:
  - valuation method used (LFT/proportional or agreed hourly pay)
  - applied rate (amount per hour and/or factor)
  - resulting amount
  - who authorized it and when
  - reference to the day’s attendance records
- **RF-47c (Per-employee configuration):** Each employee must have an effective configuration for **how overtime is paid**:
  - (a) **Proportional to wage** per LFT criteria (company-configurable), or
  - (b) **Agreed hourly pay** (fixed rate)
  This configuration must have an **effective-dated history** (start/end) for traceability.

### 9.15 Reports
- **RF-48:** “Today” view.
- **RF-49:** Pay-period summary per employee (full breakdown).
- **RF-50:** Close exports (CSV/PDF) + audit.

---

## 10) Business Rules (RN)

### 10.1a Late deduction (> 30 min) (SushiGo)
- **RN-00:** If lateness (entry or return from lunch) is **> 30 minutes**, deduct the **exact number of late minutes** from pay (*minute not worked = minute not paid*).
- **RN-00b:** There is no additional sanction beyond:
  - the **unworked-minutes deduction**, and
  - potential impact on **punctuality bonus** (if applicable).

### 10.1b Partial leave (paid / unpaid)
- **RN-00c:** Any partial leave (arrive late, leave early, take time) must be recorded and approved.
- **RN-00d (Unpaid):** If the leave is **unpaid**, deduct pay for the **exact time** taken **minute by minute**.
- **RN-00e (Paid):** If the leave is **paid**, no deduction applies; only a **historical record** is stored.

### 10.1 Punctuality (SushiGo)
- **RN-01:** Ranges by **lateness** (0–9:59 = 100%, 10–14:59 = 50%, 15–20:59 = 25%, 21–25:59 = 10%, 26:00+ = 0%), computed against the employee’s **expected time** from their schedule.
- **RN-02:** Weekly bonus prorated:
  - $110/$100 ÷ 6; $50 ÷ 3.
- **RN-03:** Day off → no bonus.
- **RN-04:** Extra → no bonus.

### 10.2 “Free hours” benefit from punctuality (SushiGo)
- **RN-05:** 6 punctual days → 1h on weekend
- **RN-06:** 5 punctual days → 1h on weekdays
- **RN-07:** 4 punctual days → 0.5h on weekdays
- **RN-08:** Validation: punctual on the last 2 days of the period

### 10.3 Negotiated extra days
- **RN-09:** Extra requires approval.
- **RN-10:** Extra pay is by agreement (fixed amount or multiplier).

### 10.4 Overtime bank
- **RN-11:** Overtime is **paid only** if the **Manager authorizes** it at check-out or day validation; otherwise it remains **historical**.
- **RN-11b (Valuation):** When paying overtime, apply the employee’s configured method (LFT/proportional or agreed hourly rate) and store the pay history.
- **RN-12:** Every movement changes the balance and must be auditable.

### 10.5 Proportional rest (original draft)
- **RN-13 (Full – per day):** 1/6 rest day per day worked.
- **RN-14 (Full – per hour):** 1/48 rest day per hour worked.
- **RN-15 (Partial):** proportional per hour.

### 10.6 Close
- **RN-16:** The close stores a calculation snapshot.
- **RN-17:** Post-close changes require reopen/recalculate with audit.

---

## 11) Closed definitions (formerly DA)

- **DC-01 (Overtime):** Paying overtime **requires authorization**. The **Manager** must manually mark it as **paid** when recording **check-out**. If not authorized, overtime remains **historical** (no balance accumulation).
- **DC-02 (Negotiated extra day):** An **Extra** day **does not count** toward **proportional rest** and **does not apply** for punctuality bonus.
- **DC-03 (Overtime valuation):** Overtime can be valued in two ways, configurable **per employee** with **history**:
  1) **Proportional to wage**, following **LFT** criteria (company-configurable rules).
  2) **Agreed hourly rate** (fixed rate).
  When paying, the system must store the **method**, **rate**, and **amount** for audit/history.

---

## 12) Annexes (pending)
- Real weekly calculation example (table) + results
- Domain diagram (Mermaid)
