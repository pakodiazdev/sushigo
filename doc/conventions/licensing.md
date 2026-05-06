# SushiGo Licensing — Decision & Rationale

## What this document is

This document explains the licensing choice for SushiGo, who can use the project and how, and the reasoning behind each decision. It is written for three audiences: recruiters evaluating the portfolio, technical leads reviewing architecture decisions, and developers who want to use or contribute to the project.

---

## Context: what SushiGo is right now

SushiGo is currently a **portfolio project** — a production-quality, full-stack codebase built to demonstrate real-world engineering capabilities across Laravel, React, Flutter, and DevOps tooling.

At the same time, SushiGo is the foundation of **ComandaFlow**, a future SaaS platform for restaurant management. The code is production-grade by design: real domain modeling, real auth flows, real test coverage, real CI pipelines. Not a toy project built to look good in a README.

This dual nature — public portfolio + future commercial product — is exactly what makes the licensing decision non-trivial.

---

## Requirements

Before evaluating options, these were the hard requirements:

1. **Source must be publicly visible** — recruiters and technical leads need to read the code
2. **Consulting and implementation must be permitted** — integrators should be able to charge for installing and supporting the system for their clients
3. **Competing SaaS must be prohibited** — nobody should be able to offer this as a hosted service and compete with the author
4. **The code must never auto-convert to open source** — the author retains full commercial rights indefinitely

That last point rules out BSL 1.1 immediately.

---

## Why not BSL 1.1 (Business Source License)

BSL 1.1 was the first candidate. It protects against SaaS competition and allows consulting, which satisfies requirements 1–3. However, BSL 1.1 has a mandatory structural requirement: a **Change Date** after which the license automatically converts to an open source license (typically Apache 2.0 or MIT).

This automatic conversion is not optional — it is part of the BSL contract by design. MariaDB built it in deliberately to signal that the code will eventually become fully open source.

That directly violates requirement 4. The author has no intention of opening the commercial rights on any fixed date. BSL is designed for a "commercial window" model; SushiGo needs permanent protection.

---

## Why not MIT or Apache 2.0

Both allow **anyone** to clone the repository, deploy it as a SaaS platform, sell access to it as a hosted service, and build a competing product with zero restrictions beyond a copyright notice. Violates requirement 3.

---

## Why not GPL

GPL forces all derivative works to be released under GPL as well. That blocks proprietary forks but creates a different problem: any business using the code in a product must open-source their entire product.

More critically, GPL does not protect against SaaS exploitation — the "SaaS loophole" means a company can run GPL software as a cloud service without ever distributing the modified source code. AGPL closes that loophole but brings all the other GPL constraints, which would block legitimate client installations unless the client also open-sources their infrastructure.

---

## Why not PolyForm Noncommercial

PolyForm Noncommercial prohibits any commercial use — including paid consulting, implementation services, and on-premise installations for clients. That is too restrictive. The goal is to block **competing SaaS platforms**, not the entire ecosystem of professional services around the software.

---

## Why Elastic License 2.0 (ELv2)

ELv2 is used by Elastic for Elasticsearch, Kibana, and related projects. It is purpose-built for exactly this scenario: source code that is publicly readable and usable, with one specific prohibition.

The key clause:

> **You may not provide the software to third parties as a hosted or managed service, where the service provides users with access to any substantial set of the features or functionality of the software.**

That one sentence covers the only use case the author needs to prohibit. Everything else — reading, forking, self-hosting, installing for clients, charging for implementation — is permitted.

Critically, **ELv2 has no Change Date**. The license does not auto-convert to open source. The author retains commercial rights permanently.

| Requirement | ELv2 |
|---|---|
| Source publicly visible | ✅ |
| Consulting and implementation permitted | ✅ |
| Competing SaaS prohibited | ✅ |
| No automatic open-source conversion | ✅ |

All four requirements satisfied.

---

## What ELv2 allows and prohibits

| Use case | Allowed |
|---|---|
| Viewing and studying the source code | ✅ |
| Forking for personal or educational use | ✅ |
| Using as a portfolio reference | ✅ |
| Installing for your own business operations | ✅ |
| Installing for a client on their own server | ✅ |
| Charging for implementation, configuration, support | ✅ |
| Customizing for a specific client | ✅ |
| Offering as a hosted SaaS to multiple clients | ❌ |
| Building a competing multi-tenant platform | ❌ |
| Sublicensing or reselling access | ❌ |

---

## The author's rights

As the copyright holder, the author (Pako Díaz) retains full rights regardless of ELv2:

- Commercialize the project as a SaaS at any time
- Sell commercial licenses to businesses that need hosted use
- Release future versions under any license
- Dual-license the project (public ELv2 + private commercial license)

---

## Portfolio context

This project is intentionally public. The source code is visible so that:

- Recruiters can verify the quality and depth of the engineering
- Technical leads can evaluate architectural decisions directly from the code
- The broader developer community can learn from real-world patterns in Laravel, React, and Flutter

ELv2 makes this possible without giving away the commercial rights. The code is readable, forkable, and usable for learning — just not exploitable as a competing product.

---

## Projects using ELv2

- **Elasticsearch** — distributed search engine
- **Kibana** — analytics and visualization platform
- **Logstash** — data processing pipeline
- **Beats** — lightweight data shippers

These are production-grade, enterprise-scale projects. Using ELv2 signals the same level of intentionality around commercial positioning.

---

## Contact for commercial licensing

If you are a business that needs to use SushiGo in a way that ELv2 does not permit (hosted deployment, multi-tenant service, OEM integration), contact the author to discuss a commercial license:

**jfcodiaz@gmail.com**

---

## Related files

- `LICENSE` — full Elastic License 2.0 text
- `README.md` — license summary with use-case table
- `doc/tasks/backlog/145-define-project-license.md` — task tracking entry
