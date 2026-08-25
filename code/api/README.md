# SushiGo API

Laravel 12 backend for **SushiGo**, a full-stack tenant platform for restaurant operations —
inventory, cash management, attendance/payroll, and multi-branch support. Part of the
[SushiGo monorepo](../../README.md).

## About

This API is a Single Action Controller (SAC) Laravel application built with Passport OAuth,
Spatie Permissions, and L5 Swagger. Composer/Artisan commands (`composer install`,
`php artisan test`, etc.) run fine from this directory on their own — see the repository root
[`README.md`](../../README.md) and [`doc/architecture/`](../../doc/architecture/) for the full
domain model, and the root [`CLAUDE.md`](../../CLAUDE.md) for the full local environment setup
(database, dev-lab orchestration), which is monorepo-level, not something this subdirectory
configures independently.

## Development

Development commands (tests, linters, seeders, Swagger generation) are documented in the root
[`CLAUDE.md`](../../CLAUDE.md) and [`doc/conventions/`](../../doc/conventions/).

## License

This project is licensed under the [Elastic License 2.0](../../LICENSE) (ELv2) — see
[`doc/conventions/licensing.md`](../../doc/conventions/licensing.md) for the rationale. It is
**not** MIT-licensed; the ELv2 terms prohibit offering this software to third parties as a hosted
or managed service.
