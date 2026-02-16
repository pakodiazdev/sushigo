# Repository & Query Organization Rules (Laravel)

> Purpose: Centralize queries and persistence rules to avoid scattered query-builder logic across the codebase.
> This is **not** about swapping Eloquent later; it is about **consistency, readability, and maintainability**.

---

## Core Principles

1. **Controllers are thin**
   - Controllers should not contain query-builder chains (`where`, `join`, `with`, `orderBy`, etc.).
   - Controllers delegate work to **Use Cases / Services** and/or **Repositories**.

2. **Repositories are the Query Hub**
   - A repository is the single place to keep **named queries** and **persistence orchestration** for a model/aggregate.
   - Repositories prevent duplicated query logic across the application.

3. **Eloquent is still the ORM**
   - We are not trying to hide Eloquent completely.
   - We centralize Eloquent usage (queries, includes, transactions) to keep the rest of the system clean.

---

## BaseRepository Policy

We use a **BaseRepositoryInterface** + **BaseRepository** to avoid repeating common CRUD operations.

### BaseRepositoryInterface (common methods)
- Provides shared operations (examples):
  - `findOrFail(id)`
  - `create(data)`
  - `update(model, data)`
  - `delete(model)`
  - `paginate(perPage)`
- It enables mocking in **unit tests** without forcing an interface per model.

### BaseRepository (common implementation)
- Implements the BaseRepositoryInterface once.
- Child repositories extend BaseRepository and set the target model class (or inject the model).

### Model-specific repositories
- Each model/aggregate has a repository class that extends BaseRepository:
  - `EmployeeRepository extends BaseRepository`
  - `UserRepository extends BaseRepository`
- **Do not create a per-model interface** unless the model requires specialized logic and/or multiple implementations.

---

## Dependency Injection Rules (IMPORTANT)

### Default rule: inject the concrete model repository
- When a class needs persistence/query access for an entity, inject the **repository of that entity**:
  - ✅ Inject `EmployeeRepository`
  - ✅ Inject `UserRepository`
- We **avoid injecting per-model interfaces** when there is only one implementation.

### When to introduce a model-specific interface
Create and inject `EmployeeRepositoryInterface` **only when**:
- The model repository has **multiple implementations**, e.g.:
  - `EloquentEmployeeRepository`
  - `InMemoryEmployeeRepository`
  - `HttpEmployeeRepository`
- Or when you need a strict contract because the boundary is critical and must be swappable.

### Binding rule (only when multiple implementations exist)
- If there are multiple implementations:
  1. Create `EmployeeRepositoryInterface`
  2. Bind the desired implementation in a service provider:
     - `EmployeeRepositoryInterface -> EloquentEmployeeRepository` (default)
  3. Inject the interface in dependents.

> If there is only one implementation, keep it simple: inject the concrete repository and skip the interface.

---

## What Belongs in BaseRepository vs Model Repositories

### ✅ BaseRepository should contain
- Truly generic CRUD operations that apply to all models.
- Safe defaults for `query()` / `newQuery()` (if you expose them).
- Shared pagination helpers used consistently.

### ✅ Model repositories should contain
- **Named queries** used by endpoints/screens:
  - `paginateIndex(filters)`
  - `findByPublicIdOrFail(publicId)`
  - `searchActiveByBranch(branchId, filters)`
- **Eager-loading policies** for API responses:
  - default `with([...])` sets per use case
- **Aggregate writes** and multi-table operations (transactional):
  - update model + sync roles + update related user

### ❌ Avoid in BaseRepository
- Domain-specific queries (filters, business logic).
- Re-implementing query builder methods (e.g., adding `where*` methods).

---

## Scopes vs Repository Responsibilities

### ✅ Use Eloquent scopes for small reusable predicates
Scopes are for tiny query fragments that make sense anywhere:
- `active()`
- `byBranch($branchId)`
- `search($term)`

### ✅ Use repositories for composed/endpoint-level queries
Repositories compose scopes + includes + sorting + pagination:
- `paginateIndex(EmployeeIndexFilters $filters)`
- `findForShowByPublicId($publicId)` (with required relations)

---

## The “Two-Occurrences” Rule

If the same query (or similar query shape) appears **twice** in the codebase:
- Extract it into a **named model repository method**.

---

## Eager Loading Rules

1. **No N+1 queries**
   - Repositories define the default relations required by each query/use case.
2. **Be intentional**
   - Provide separate methods for different loading needs:
     - `findForShow(...)` vs `findForEdit(...)` vs `findForExport(...)`

---

## Write Operations & Consistency

1. **Single-model updates**
   - Can be handled by BaseRepository (`update`) when it is truly generic.
   - Prefer model repositories when the update:
     - maps request fields into multiple places,
     - includes special rules,
     - is reused in more than one place.

2. **Aggregate updates**
   - Any update touching multiple tables/relations belongs in:
     - a Use Case/Service, or
     - a model repository method dedicated to that aggregate write.
   - Must be transactional.

3. **Optional fields behavior (important)**
   - If a field is not present in the request payload, do not modify it.
   - If a field is present but empty (e.g., `roles: []`), interpret it as an explicit update (e.g., clear roles).

---

## Testing Guidance

1. **Feature/Integration tests**
   - Prefer real DB assertions.
   - Use repositories normally (do not mock by default).

2. **Unit tests**
   - Mock **BaseRepositoryInterface** when testing pure application logic (use cases/services) without DB.
   - Avoid mocking Eloquent models directly when possible.
   - Only mock a **model-specific interface** if multiple implementations exist or the boundary is critical.

---

## Naming Conventions

- Repositories should be named after the aggregate/model:
  - `EmployeeRepository`
  - `UserRepository`
- Repository methods should describe intent:
  - ✅ `findByPublicIdOrFail($publicId)`
  - ✅ `paginateIndex($filters)`
  - ❌ `getEmployeeListQuery()` (too vague)
  - ❌ `whereActiveAndBranchAndSearch()` (too implementation-heavy)

---

## Folder Structure

Preferred (simple, pragmatic):
- `app/Repositories/BaseRepositoryInterface.php`
- `app/Repositories/BaseRepository.php`
- `app/Repositories/EmployeeRepository.php`
- `app/Repositories/UserRepository.php`

If multiple implementations are ever required (only then):
- `app/Repositories/Contracts/...`
- `app/Repositories/Eloquent/...`
- `app/Repositories/InMemory/...`

Do **not** introduce driver folders until a second implementation exists.

---

## Agent Instructions (for AI assistants)

When contributing code:
1. Do not place query-builder chains inside controllers.
2. If adding a new endpoint query, create/extend a model repository method for it.
3. Reuse existing repository methods and scopes.
4. If performing multiple writes (model + relations), use a transaction.
5. Keep API response shapes stable and load required relations in repositories.
6. Inject concrete model repositories by default; only inject model interfaces when multiple implementations exist.

---
