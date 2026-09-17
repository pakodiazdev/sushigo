# TD-08 · PHP 8.5+ is the API's sole supported runtime, mechanically enforced by Composer

**Status:** Accepted and implemented ([#638](https://github.com/pakodiazdev/sushigo/issues/638)).

## Decision

SushiGo Admin's API declares, runs, and tests exactly **one** PHP floor: `^8.5`. There is no
supported-but-untested older PHP version.

- `code/api/composer.json`'s `require.php` is `^8.5` — previously `^8.2`, a stale value nothing in
  the pipeline had exercised since #151 moved the Docker image and CI to PHP 8.5.
- `docker/app/Dockerfile`'s `FROM php:8.5-apache` base image, and every `_api-ci.yml` job's
  `shivammathur/setup-php@v2` step, already ran PHP 8.5 exclusively — this decision brings the
  declared Composer contract in line with that existing, unchanged reality, not the other way
  around.
- `code/api`'s `lint` CI job runs `composer check-platform-reqs` right after `composer install` —
  a single fast command in an already-existing job, not a new runner or a second PHP-version test
  matrix — failing the job (and therefore `ci-gate`) whenever the actual runner's PHP/extension
  platform, or any installed package's own declared platform requirement, no longer satisfies the
  root `composer.json` contract.

Because the declared floor and the only PHP version CI ever executes code on are now the same
version, any code that requires a PHP feature newer than 8.5 fails outright the moment CI's own
`api-tests` job tries to run it — there is no separate, lower-version interpreter left to silently
diverge from what `composer.json` promises.

## Justification

**The concrete failure this closes.** Sprint 8's review of issue #415/#621 caught PHP 8.3-only
typed class constants merging under a PR whose `composer.json` still declared `^8.2` support —
CI never actually ran anything on PHP 8.2, so nothing in the pipeline could have caught it; a
human reviewer did, by hand, reading the diff. `composer check-platform-reqs` in CI turns that
into a mechanical, automatic check instead of a reviewer's attentiveness.

**Why raise the floor instead of actually testing PHP 8.2+?** No environment in this repository —
not the Docker image, not local developer setup, not CI — has run PHP 8.2 since #151 (Sprint-era).
Continuing to *declare* 8.2+ support without ever exercising it is a documentation liability, not
a real compatibility guarantee: the "support" was already fictional. Actually restoring PHP 8.2
compatibility would mean either running a second, real PHP 8.2 test matrix (doubling CI cost for a
version nothing deploys to) or adopting a static compatibility linter (e.g. PHPCompatibility) that
still can't catch every runtime-only divergence a full test run does. Aligning the declared floor
to the version already running everywhere is the low-cost option that fully closes the gap.

**Why `composer check-platform-reqs` and not a second PHP-version job.** The Acceptance Criteria
for #638 explicitly rule out "blindly duplicat[ing] every expensive test job." A platform-reqs
check is a single Composer command against packages already installed for `lint` — no new
container, no new dependency install, no new test run. It validates the *declarative* contract
(does the platform satisfy what `composer.json`/`composer.lock` claim); the *language-feature*
contract (does the code itself only use 8.5-or-older syntax) is already validated for free by
`api-tests` running the full suite on exactly PHP 8.5 — the same mechanism that would have caught
the #415/#621 regression the moment the declared and tested versions matched.

**What was deliberately left alone.** `code/api/app/Support/Money/Decimal.php` still implements
half-up rounding manually via `bcmath` rather than PHP 8.4+'s `bcround()`, a choice originally
made when `composer.json` declared `^8.2`. Switching to `bcround()` is a legitimate follow-up now
that the floor is 8.5, but it is a behavior-neutral micro-optimization, not part of restoring the
compatibility *contract* — out of scope for #638 by its own "no unrelated dependency/behavior
changes" boundary.

## Alternatives considered

- **Add a low-cost PHP 8.2 compatibility job (PHPCompatibility / Rector dry-run) and keep
  `composer.json` at `^8.2`.** Rejected: this repo has not run PHP 8.2 anywhere since #151, so
  "supporting" it is aspirational, not real — a static linter would provide false confidence
  without ever executing the code on that version, and genuinely restoring runtime coverage would
  duplicate the existing 4-shard `api-tests` matrix on a version nothing deploys to.
- **Leave `composer.json` at `^8.2` and rely on reviewer attentiveness.** Rejected: this is the
  exact status quo that let PHP 8.3-only syntax merge under a false 8.2+ claim in #415/#621 — the
  whole point of #638 is to make this mechanical, not to keep depending on a human catching it.
