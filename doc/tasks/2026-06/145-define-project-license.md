# 145 - Define Project License (Elastic License 2.0)

**Type:** 🔧 Legal / Repository Governance  
**Priority:** Medium  
**GitHub Issue:** [#145](https://github.com/pakodiazdev/sushigo/issues/145)

---

## 📖 Story

**English:**  
As the sole owner of SushiGo, I need a license that makes the source code publicly visible for portfolio and educational purposes, while permanently preventing third parties from offering the project as a competing hosted SaaS. Implementation consultants should be able to charge for their work; nobody else should be able to commercialize the platform itself — ever.

**Español:**  
Como único propietario de SushiGo, necesito una licencia que haga el código fuente visible para portfolio y educación, mientras previene permanentemente que terceros ofrezcan el proyecto como un SaaS hospedado competidor. Los consultores de implementación pueden cobrar por su trabajo; nadie más puede comercializar la plataforma — nunca.

---

## 🏗️ Decision

**License chosen: Elastic License 2.0 (ELv2)**

### Hard requirements

1. Source must be publicly visible — recruiters and technical leads need to read the code
2. Consulting and implementation must be permitted — integrators can charge for installing the system for clients
3. Competing SaaS must be prohibited — nobody can offer this as a hosted service
4. **The code must never auto-convert to open source** — commercial rights are permanent

### Why not the alternatives

| License | Problem |
|---|---|
| MIT / Apache 2.0 | Anyone can clone and sell as SaaS |
| GPL | SaaS loophole; forces client infrastructure to be open source |
| PolyForm Noncommercial | Blocks legitimate consulting and implementation |
| **BSL 1.1** | **Mandatory Change Date — code auto-converts to Apache 2.0 on a fixed date. Violates requirement 4.** |
| **ELv2** | ✅ All four requirements satisfied, no Change Date |

BSL 1.1 was the first candidate but was eliminated because it requires a Change Date by design. The code would automatically become open source on that date — that is incompatible with permanent commercial protection.

### What ELv2 allows and prohibits

| Use case | Allowed |
|---|---|
| Study, fork, portfolio, research | ✅ |
| Self-hosting for your own business | ✅ |
| Installing for a single client (on-premise) | ✅ |
| Charging for implementation, configuration, support | ✅ |
| Customizing for a specific client | ✅ |
| Offering as hosted SaaS to multiple clients | ❌ |
| Building a competing multi-tenant platform | ❌ |
| Sublicensing or reselling access | ❌ |

---

## ✅ Technical Tasks

- [x] 📝 Add `LICENSE` file with Elastic License 2.0 text
- [x] 📝 Add `doc/conventions/licensing.md` — full rationale document
- [x] 📝 Update `README.md` with license section and use-case table

---

## 🎯 Acceptance Criteria

- [x] `LICENSE` file present at repo root with ELv2 text and copyright notice
- [x] `README.md` includes license summary table and link to rationale
- [x] `doc/conventions/licensing.md` explains all evaluated alternatives and why ELv2 was chosen
- [ ] License visible on GitHub repo home page (after PR merge)

---

## 🔗 References

- ELv2 official text: https://www.elastic.co/licensing/elastic-license
- Projects using ELv2: Elasticsearch, Kibana, Logstash, Beats
- Rationale doc: `doc/conventions/licensing.md`

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h` · **Pessimistic:** `2h` · **Tracked:** `0.1h`

### 📅 Sessions
```json
[
  { "date": "2026-06-14", "start": "00:00", "end": "00:05" }
]
```
