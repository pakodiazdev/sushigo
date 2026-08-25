# 📚 Documentation Structure

This directory contains all project documentation with a pragmatic language strategy.

## Structure

```
doc/
├── architecture/          # System architecture and design docs
│   ├── *.en.md           # English versions
│   └── *.es.md           # Spanish versions
│
├── conventions/           # Development standards (English only)
│   ├── backend/          # Laravel standards
│   ├── frontend/         # React/TypeScript standards
│   ├── git/              # Git workflow
│   └── tasks.md          # Task documentation guide
│
└── tasks/                # Task tracking logs (English only)
    └── 2025-11/          # Tasks organized by year-month
```

## Content Overview

### Architecture (`architecture/`)

Available in **English and Spanish** (`.en.md` and `.es.md` suffixes):

-   **Inventory Architecture**: Complete domain model, ER diagrams, and operational flows for the inventory system
-   **Product Catalog Architecture** (`architecture/product-catalog/`): Target design for Product → Variant → Purchase Presentation, replacing the legacy `ProductWizard`
-   **Domain-Oriented Frontend Architecture** (`architecture/frontend/`): Feature-first boundaries, dependency rules, Spanish frontend URLs, and incremental migration guidance
-   **Security & User System**: Authentication, authorization, roles, and permissions design

### Decisions (`decisions.md` + `decisions/`)

Index and individual ADRs recording accepted technical decisions — see [Technical Decisions](decisions.md).

### Conventions (`conventions/`)

**English only** - Technical standards for code:

-   **Backend**: Laravel standards for controllers, services, actions, repositories, API rules, and seeder system
-   **Frontend**: React/TypeScript routing structure and component organization
-   **Git**: Commit message format and branching strategy (commits must be in English)

### Tasks (`tasks/`)

**English only** - Engineering task logs documenting:

-   Implementation details
-   Technical decisions
-   Progress tracking
-   Code examples and patterns

## Language Strategy

-   **Architecture docs**: Bilingual (English + Spanish) for better team understanding
-   **Conventions & Tasks**: English only (aligned with code, commits, and technical standards)

This approach balances accessibility for Spanish-speaking team members with the reality that code, APIs, and technical documentation are in English.

## Contributing

When adding new architecture documentation:

1. Create both `.en.md` and `.es.md` versions
2. Ensure equivalent content in both languages
3. Keep diagrams and code examples identical

For conventions and tasks:

1. Write in English only
2. Use clear, concise language
3. Include code examples

## Quick Links

### Architecture (Bilingual)

-   [Inventory Architecture](architecture/inventory-architecture.en.md) | [Arquitectura de Inventarios](architecture/inventory-architecture.es.md)
-   [Product Catalog Architecture](architecture/product-catalog/product-catalog-architecture.en.md) | [Arquitectura del Catálogo de Producto](architecture/product-catalog/product-catalog-architecture.es.md)
-   [Domain-Oriented Frontend Architecture](architecture/frontend/domain-oriented-frontend-architecture.en.md) | [Arquitectura del Frontend Orientada a Dominios](architecture/frontend/domain-oriented-frontend-architecture.es.md)
-   [Security Architecture](architecture/security-and-user-system-architecture.en.md) | [Arquitectura de Seguridad](architecture/security-and-user-system-architecture.es.md)

### Conventions (English)

-   [Task Documentation Guide](conventions/tasks.md)
-   [Git Commit Conventions](conventions/git/commits.md)
-   [Backend Standards](conventions/backend/)
-   [Frontend Standards](conventions/frontend/)
-   [Frontend Domain-Oriented Structure](conventions/frontend/domain-oriented-structure.md)

### Recent Tasks (English)

-   [#004 - Authentication System](tasks/2025-11/004-authentication-frontend-zustand.md)
-   [#005 - Inventory Design Documentation](tasks/2025-11/005-inventory-product-onboarding.md)
-   [#006 - Inventory Product Onboarding](tasks/2025-11/006-inventory-product-onboarding.md)

---

**Last Updated**: 2026-08-24
**Maintained by**: SushiGo / ComandaFlow Team
