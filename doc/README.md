# 📚 Documentation Structure

This directory contains all project documentation organized by language.

# 📚 Documentation Structure

This directory contains all project documentation with a pragmatic language strategy.

## Structure

```
doc/
├── architecture/          # System architecture and design docs
│   ├── *.en.md           # English versions
│   ├── *.es.md           # Spanish versions
│   └── identifiers-hashids.md
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
-   **Security & User System**: Authentication, authorization, roles, and permissions design
-   **Hashids Identifiers**: Guidelines for secure ID obfuscation in APIs (English only)

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
-   [Security Architecture](architecture/security-and-user-system-architecture.en.md) | [Arquitectura de Seguridad](architecture/security-and-user-system-architecture.es.md)
-   [Hashids Identifiers](architecture/identifiers-hashids.md)

### Conventions (English)

-   [Task Documentation Guide](conventions/tasks.md)
-   [Git Commit Conventions](conventions/git/commits.md)
-   [Backend Standards](conventions/backend/)
-   [Frontend Standards](conventions/frontend/)

### Recent Tasks (English)

-   [#004 - Authentication System](tasks/2025-11/004-authentication-frontend-zustand.md)
-   [#005 - Inventory Design Documentation](tasks/2025-11/005-inventory-product-onboarding.md)
-   [#006 - Inventory Product Onboarding](tasks/2025-11/006-inventory-product-onboarding.md)

## Content Overview

### Architecture (`architecture/`)

-   **Inventory Architecture**: Complete domain model, ER diagrams, and operational flows for the inventory system
-   **Security & User System**: Authentication, authorization, roles, and permissions design
-   **Hashids Identifiers**: Guidelines for secure ID obfuscation in APIs

### Conventions (`conventions/`)

-   **Backend**: Laravel standards for controllers, services, actions, repositories, API rules, and seeder system
-   **Frontend**: React/TypeScript routing structure and component organization
-   **Git**: Commit message format and branching strategy

### Tasks (`tasks/`)

Engineering task logs organized by date, documenting:

-   Implementation details
-   Technical decisions
-   Progress tracking
-   Code examples and patterns

## Language Strategy

-   **English (en/)**: Primary language for code, APIs, and technical documentation
-   **Spanish (es/)**: Secondary language for architecture docs and team collaboration

Both directories maintain identical structure and equivalent content, only differing in language.

## Contributing

When adding new documentation:

1. Create the document in English first (`en/`)
2. Translate and add to Spanish (`es/`)
3. Ensure both versions maintain the same structure and content
4. Update this README if adding new categories

## Quick Links

### English

-   [Inventory Architecture](en/architecture/inventory-architecture.md)
-   [Security Architecture](en/architecture/security-and-user-system-architecture.md)
-   [Git Commit Conventions](en/conventions/git/commits.md)
-   [Task Documentation Guide](en/conventions/tasks.md)

### Español

-   [Arquitectura de Inventarios](es/architecture/inventory-architecture.md)
-   [Arquitectura de Seguridad](es/architecture/security-and-user-system-architecture.md)
-   [Convenciones de Commits Git](es/conventions/git/commits.md)
-   [Guía de Documentación de Tareas](es/conventions/tasks.md)

---

**Last Updated**: 2025-11-05
**Maintained by**: SushiGo / ComandaFlow Team
