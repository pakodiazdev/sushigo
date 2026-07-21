# 🐛 Task #267: Review and clear SonarCloud Security Hotspot in sushigo-api

## 📖 Story

**English:**
As a developer, I need to review the open Security Hotspot flagged by SonarCloud for sushigo-api, so the project's security review status stays clean and any real risk is addressed or consciously accepted with justification.

**Español:**
Como desarrollador, necesito revisar el Security Hotspot abierto reportado por SonarCloud para sushigo-api, para que el estado de revisión de seguridad del proyecto se mantenga limpio y cualquier riesgo real sea resuelto o aceptado conscientemente con justificación.

---

## 🔍 SonarCloud Finding

| Rule | Category | Probability | File | Line |
|---|---|---|---|---|
| `php:S2245` | weak-cryptography | MEDIUM | `database/seeders/Development/EmployeeSeeder.php` | 291 |

**Message:** "Make sure that using this pseudorandom number generator is safe here."

## ✅ Technical Tasks

- [x] 🔍 Inspect `database/seeders/Development/EmployeeSeeder.php` line 291 — confirmed `rand()` jitters hire/termination dates for fake dev employees in `randomDateBetween()`, not auth tokens, passwords, or secrets. Confirmed it's the only `rand()` usage across `database/seeders/`.
- [x] 🔧 Replace `rand(0, $days)` with `random_int(0, $days)` — cheap, no behavior change, removes the hotspot at the source
- [x] 🔍 Mark the hotspot reviewed (Fixed) in SonarCloud via API with justification comment
- [x] 🔍 Confirm SonarCloud Security Hotspots page shows 0 items `TO_REVIEW` for sushigo-api

## 🎯 Acceptance Criteria

- [x] The hotspot at `EmployeeSeeder.php:291` is resolved (code fix) and marked reviewed in SonarCloud with justification
- [x] https://sonarcloud.io/project/security_hotspots?id=pakodiazdev_sushigo-api shows 0 hotspots `TO_REVIEW`

## 🚫 Explicitly Out of Scope

- No PHPUnit test added: `randomDateBetween()` is a private helper inside a `Development/` seeder, which per `doc/conventions/testing/test-data-seeders.md` is never exercised by Cypress or the PHPUnit suite — there is no meaningful coverage gap to close here.

---

## 🔗 References

- SonarCloud Security Hotspots: https://sonarcloud.io/project/security_hotspots?id=pakodiazdev_sushigo-api
- Rule: `php:S2245`
- Hotspot key: `AZyn20YxN4TloHhSW45F`

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `0.25h` · **Pessimistic:** `1h` · **Tracked:** `5m`

### 📅 Sessions
```json
[
  { "date": "2026-07-21", "start": "14:20", "end": "14:25" }
]
```

## 📊 Retrospective
- **Actual total:** 5m (5m)
- **vs optimistic:** −10m
- **vs pessimistic:** −55m

**Justification:**

The fix was a single-line RNG swap (`rand()` → `random_int()`) in a private seeder helper whose only consumer is fake dev data generation, so inspection and implementation were immediate with no ambiguity. Marking the hotspot reviewed in SonarCloud was done directly via the Hotspots API using an existing token, avoiding any manual UI navigation. No unplanned rework or scope discovery occurred.
