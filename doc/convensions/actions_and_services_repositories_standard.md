# **Actions, Services, and Repositories Standard** (Laravel 12)

> **Scope:** ComandaFlow / SushiGo · Laravel 12 · PHP 8.3 · l5-swagger/OpenAPI 3  
> **Purpose:** Define consistent architectural patterns to keep code clean, testable, and scalable.  
> Complements the standards for **Controllers (SAC)**, **FormRequests**, and **Responses**.

---

## 0) TL;DR (Quick Rules)

- **Actions** → One business operation per class, with `__invoke()`. No infrastructure logic. Idempotent if possible.  
- **Services** → Encapsulate **infrastructure** or **shared logic** (email, storage, PDF, payment gateways). May contain multiple methods.  
- **Repositories** → *Optional*. Use when you need to decouple from ORM, handle complex queries, or combine multiple data sources.  
- **Controllers** → Only orchestrate → receive a `FormRequest`, invoke an **Action**, return a **Response**.  
- **Transactions** → Belong in the **Action** (application layer), not controllers or repositories.  
- **Exceptions** → **Actions** throw semantic exceptions; the **Handler** maps them to HTTP responses.  
- **Dependency Injection** → Always inject dependencies in constructors. Avoid direct Facade calls in Actions (use Services for that).

---

## 1) Definitions

### 1.1 Actions (Application Layer)

- **Definition:** Small classes that execute **a single use case**.  
- **Signature:** `public function __invoke(DTO|array $input): DTO|Model|array`  
- **Responsibility:** Orchestrate business logic, coordinate **Services**, **Repositories**, and **Events**.  
- **Do NOT:** Return HTTP responses or directly use external frameworks (e.g., Mail, Storage, Http). Those belong in **Services**.

**Example:**

```php
namespace App\Actions\Inventory;

use App\Repositories\ItemRepository;
use App\Services\Stock\StockCalculator;
use Illuminate\Support\Facades\DB;

class AdjustStock
{
    public function __construct(
        private ItemRepository $items,
        private StockCalculator $calculator
    ) {}

    public function __invoke(string $itemId, int $delta, ?string $reason = null): array
    {
        return DB::transaction(function () use ($itemId, $delta, $reason) {
            $item = $this->items->findOrFail($itemId);
            $newQty = $this->calculator->applyDelta($item->quantity, $delta);
            $this->items->updateQuantity($itemId, $newQty);
            return ['item_id' => $itemId, 'quantity' => $newQty];
        });
    }
}
```

---

### 1.2 Services (Infrastructure / Support Layer)

- **Definition:** Classes that encapsulate **external integrations** or **shared utilities** (PDFs, S3, Mail, APIs, etc.).  
- **Signature:** Multiple task-oriented public methods.  
- **Benefit:** Isolate infrastructure concerns and make unit testing easier (mocking/stubbing).

**Example:**

```php
namespace App\Services\Pdf;

use Barryvdh\DomPDF\Facade\Pdf;

class PdfService
{
    public function renderHtml(string $html): string
    {
        return Pdf::loadHTML($html)->output();
    }
}
```

---

### 1.3 Repositories (Data Access Layer, Optional but Pragmatic)

- **When to use:**  
  - You need to decouple the domain from the ORM.  
  - You perform **complex queries** or combine multiple data sources (DB + API + cache).  
  - You want reusable query logic between Actions.

- **When NOT to use:** For simple CRUD — don’t over-engineer.

**Example (interface + Eloquent implementation):**

```php
namespace App\Repositories;

use App\Models\Item;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface ItemRepository
{
    public function findOrFail(string $id): Item;
    public function paginate(int $perPage = 15): LengthAwarePaginator;
    public function updateQuantity(string $id, int $quantity): void;
}
```
```php
namespace App\Repositories\Eloquent;

use App\Models\Item;
use App\Repositories\ItemRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class EloquentItemRepository implements ItemRepository
{
    public function findOrFail(string $id): Item
    {
        return Item::query()->findOrFail($id);
    }

    public function paginate(int $perPage = 15): LengthAwarePaginator
    {
        return Item::query()->orderByDesc('created_at')->paginate($perPage);
    }

    public function updateQuantity(string $id, int $quantity): void
    {
        Item::query()->whereKey($id)->update(['quantity' => $quantity]);
    }
}
```

**Service Provider binding:**

```php
namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Repositories\ItemRepository;
use App\Repositories\Eloquent\EloquentItemRepository;

class RepositoryServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(ItemRepository::class, EloquentItemRepository::class);
    }
}
```

---

## 15) Design Patterns and References

| Pattern | Description | Reference |
|----------|--------------|------------|
| **Command Pattern** | Each Action acts as a Command that performs one operation. | [Refactoring.Guru – Command Pattern](https://refactoring.guru/design-patterns/command) |
| **Service Layer** | Encapsulates reusable logic or external integrations. | [Martin Fowler – Service Layer](https://martinfowler.com/eaaCatalog/serviceLayer.html) |
| **Repository Pattern** | Abstracts persistence and hides ORM details. | [Martin Fowler – Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html) |
| **Dependency Injection** | Promotes loose coupling between layers. | [Laravel Docs – Service Container](https://laravel.com/docs/12.x/container) |
| **Domain-Driven Design (DDD)** | Organizes code around business capabilities. | [Vaughn Vernon – Domain-Driven Design Distilled](https://www.dddcommunity.org/library/vernon_2016/) |
| **SOLID Principles** | Especially SRP (Single Responsibility Principle) and DIP (Dependency Inversion). | [Wikipedia – SOLID Principles](https://en.wikipedia.org/wiki/SOLID) |
| **Use Case Pattern** | Each Action represents one application-level use case. | [Clean Architecture Concepts](https://8thlight.com/blog/uncle-bob/2012/08/13/the-clean-architecture.html) |

---

**End of Standard v1 – Actions / Services / Repositories.**  
Any modifications should be proposed via Pull Request with rationale and examples.
