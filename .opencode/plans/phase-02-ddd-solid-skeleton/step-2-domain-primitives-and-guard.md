# P02 · Step 2 — Domain Primitives & Architecture Guard

**Project:** nestjs-ddd  |  **Phase:** P02 — DDD/SOLID Skeleton  |  **Base branch:** `dev`  |  **Status:** ✅ Done

> Source of truth: [`roadmap.md`](../../../roadmap.md) §4. Umbrella IDs `P02-04`, `P02-05`, `P02-06` stay in the roadmap; this file lists the final atomic split (`P02-04a` … `P02-06e`).
> **Format**: `P<phase>-<umbrella><letter>` — one atomic task = one commit; sibling atomic tasks share one branch (branch per umbrella task). Every atomic task uses the 7-field format: `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing`.
> **Ordering notes**: (a) `P02-04a`–`P02-04d` create the four primitives in `src/modules/shared/domain/` before `P02-04e` adds their behavioural specs and barrel. (b) `P02-05a`'s filter depends on the `DomainError` hierarchy from `P02-04d`; `P02-05b` registers it in `main.ts` after the `ValidationPipe` (P01-05) and `setupOpenApi()` (P01-08) calls; `P02-05c`/`P02-05d` add E2E and unit coverage last. (c) `P02-06a` adds the pure import scanner plus the inward-only guard, `P02-06b`/`P02-06c` add the domain-purity and common-domain-free guards over the layout from `P02-01`, `P02-06d` self-tests the scanner with a deliberate violation, and `P02-06e` wires `npm run test:arch` into CI. (d) All guards must be green before the P02 exit criterion in §6.1 is checked; the purity checks are the enforcement of the pure-domain rule stated here.

## DDD + SOLID lens for this step

- Bounded contexts own `domain/`, `application/`, `infrastructure/`, `interfaces/`; dependencies point inward.
- Domain/application depend only on port tokens; adapters are injected, never imported directly.
- Every port ships one conformance spec run against all adapters, including in-memory fallbacks.
- Business rules live in entities/value objects/use cases; controllers stay thin.
- Introduce a port only when a mechanism must be swappable or isolated for tests.

## Step Summary

Add the framework-free domain kernel — base `Entity`, base `ValueObject`, `Result` and a typed `DomainError` hierarchy — under `src/modules/shared/domain/`, with immutability and equality semantics proven by unit specs. Translate those domain errors at the HTTP edge with a global exception filter producing RFC 7807 `application/problem+json` responses and never leaking stack traces. Enforce the architecture with static Vitest guards proving inward-only imports, absolute domain purity (no Nest/TypeORM/Redis/HTTP imports) and a domain-free `src/common/`, plus a self-test proving a deliberate violation fails and a CI-wired `npm run test:arch`.

## Atomic Tasks

### `P02-04a` — Add the base Entity with identity equality
- **Description**: Create `src/modules/shared/domain/entity.base.ts` exporting an abstract `Entity<TId>` class with a `readonly id: TId`, a protected constructor, no setters, and an `equals(other: unknown): boolean` that compares constructor identity plus `id` (never field-by-field). Keep the file 100% framework-free: no `@nestjs/*`, `typeorm`, HTTP or Redis imports, not even as types. This is the first file in the new `src/modules/shared/domain/` folder created by `P02-01b`. Atomic checks: (a) identity-only equality, (b) no mutation surface, (c) zero framework imports. Behavioural specs are added in `P02-04e`; `P02-06b` enforces purity statically.
- **CLI(s)**: `mkdir -p src/modules/shared/domain`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/domain/entity.base.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/domain-primitives` (shared with `P02-04b` … `P02-04e`)
- **Commit**: `feat(domain): add base entity with identity equality`
- **Testing**: Verified by `npm run typecheck` here; `src/modules/shared/domain/entity.base.spec.ts` from `P02-04e` asserts two entities with the same id/constructor are equal, different ids are not, and `Object.isFrozen`/attempted reassignment is caught. The purity guard from `P02-06b` fails if a framework import appears.

### `P02-04b` — Add the base ValueObject with structural equality
- **Description**: Create `src/modules/shared/domain/value-object.base.ts` exporting an abstract `ValueObject<T extends object>` that holds a readonly props snapshot, deep-freezes it in the constructor, and implements `equals(other)` by deep structural comparison of props rather than reference identity. Provide a protected `getProps()` returning a copy so callers cannot mutate internal state. No framework imports. Atomic checks: (a) structural equality for equal props, (b) defensive copy prevents external mutation, (c) zero framework imports. Depends on the `P02-01b` folder; specs land in `P02-04e`.
- **CLI(s)**: `npm run typecheck`; `npm run test:unit -- value-object`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/domain/value-object.base.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/domain-primitives` (shared)
- **Commit**: `feat(domain): add base value object with structural equality`
- **Testing**: `src/modules/shared/domain/value-object.base.spec.ts` from `P02-04e` asserts two VOs with equal props compare equal, mutating a props object after construction does not change the VO, and nested objects are frozen; `vi.fn()` is used if a comparison hook is injected.

### `P02-04c` — Add the Result type for non-throwing domain operations
- **Description**: Create `src/modules/shared/domain/result.ts` exporting a discriminated `Result<T, E>` union with `ok(value)`, `err(error)`, type guards `isOk`/`isErr`, and chainable `map`, `mapErr` and `unwrapOr` helpers so use cases can express failure without throwing exceptions. Keep error payloads typed (default `E = DomainError`, introduced in `P02-04d`) and never embed stack traces in a success path. Atomic checks: (a) discriminated union with literal `ok` flag, (b) `map`/`mapErr` preserve the other branch, (c) `unwrapOr` returns the fallback on error. Depends on nothing from Nest; specs land in `P02-04e`.
- **CLI(s)**: `npm run typecheck`; `npm run test:unit -- result`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/domain/result.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/domain-primitives` (shared)
- **Commit**: `feat(domain): add result type for non-throwing domain operations`
- **Testing**: `src/modules/shared/domain/result.spec.ts` from `P02-04e` asserts `map` is skipped on `err`, `mapErr` is skipped on `ok`, `unwrapOr` returns the fallback on `err`, and `expectTypeOf` narrows the union after `isOk`/`isErr`. Coverage thresholds pass.

### `P02-04d` — Add the DomainError hierarchy with stable codes
- **Description**: Create `src/modules/shared/domain/domain-error.ts` exporting an abstract `DomainError extends Error` with readonly `code: string`, readonly `httpStatus: number` and a safe public `message`, plus concrete subclasses `ValidationDomainError` (400), `UnauthorizedDomainError` (401), `NotFoundDomainError` (404) and `ConflictDomainError` (409). Each subclass fixes its `code` and `httpStatus` so the HTTP filter in `P02-05a` maps deterministically without `instanceof` chains scattered across the codebase. Keep it framework-free — no `HttpException` import, only a numeric status hint. Atomic checks: (a) base + 4 subclasses with fixed code/status, (b) no HTTP framework types, (c) message never contains a stack trace. Depends on `P02-04c` for the default error type.
- **CLI(s)**: `npm run typecheck`; `npm run test:unit -- domain-error`.
- **Package(s)**: `None` — `@nestjs/common`'s `HttpException` is deliberately not imported at the domain layer.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/domain/domain-error.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/domain-primitives` (shared)
- **Commit**: `feat(domain): add domain error hierarchy with stable codes and status hints`
- **Testing**: `src/modules/shared/domain/domain-error.spec.ts` from `P02-04e` asserts each subclass's exact `code`/`httpStatus` pair, `instanceof DomainError`, and that `message` is the caller-provided safe string with no stack content; the mapping table is consumed by `P02-05d`.

### `P02-04e` — Add domain primitive specs and the domain barrel
- **Description**: Add four unit spec files covering every primitive created in `P02-04a`–`P02-04d`: entity identity equality and immutability, value-object structural equality and defensive copying, `Result` branch behaviour, and the `DomainError` code/status table. Also create `src/modules/shared/domain/index.ts` as the barrel exposing the primitives to contexts without deep imports. Atomic checks: (a) four spec files present and green, (b) barrel exports exactly the four primitives, (c) coverage thresholds met. This closes `P02-04`; the static purity assertion is in `P02-06b`.
- **CLI(s)**: `npm run test:unit -- domain`; `npm run test:cov`; `npm run typecheck`.
- **Package(s)**: `None` — Vitest with `vi.fn()` and seeded faker fixtures from P01-03.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/domain/entity.base.spec.ts`, `src/modules/shared/domain/value-object.base.spec.ts`, `src/modules/shared/domain/result.spec.ts`, `src/modules/shared/domain/domain-error.spec.ts`, `src/modules/shared/domain/index.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/domain-primitives` (shared)
- **Commit**: `test(domain): cover entity, value object, result and domain errors`
- **Testing**: Specs assert immutability (`Object.isFrozen`), equality semantics, `Result` mapping/narrowing and the error→status table; fixtures use `faker` with a fixed seed and mocks use `vi.fn()`; `npm run test:cov` keeps the configured thresholds. No E2E in this atomic.

### `P02-05a` — Add the global domain exception filter
- **Description**: Create `src/common/filters/domain-exception.filter.ts` implementing Nest's `ExceptionFilter` with `@Catch()`: when the thrown value is a `DomainError` from `P02-04d`, translate its `code`/`httpStatus`/`message` into an RFC 7807 `application/problem+json` body (`type`, `title`, `status`, `detail`, `instance`) via `host.switchToHttp().getResponse()`. For Nest `HttpException`s (notably the `ValidationPipe` errors from P01-05) map to the same problem shape with a generic safe title; for any unknown error return a 500 with a generic message and no `stack`, `message` or internal details. Atomic checks: (a) DomainError→problem body with correct status, (b) HttpException→problem body, (c) unknown error→500 with zero stack leakage. Depends on `P02-04d`.
- **CLI(s)**: `npm run test:unit -- filter`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `@nestjs/common` first-party `ExceptionFilter`/`ArgumentsHost` from P01, no `helmet`/custom HTTP lib.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/filters/domain-exception.filter.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/api-domain-exception-filter` (shared with `P02-05b` … `P02-05d`)
- **Commit**: `feat(api): add global filter mapping domain errors to problem responses`
- **Testing**: Unit coverage in `P02-05d` with `vi.fn()` response mocks; E2E in `P02-05c`. Purity is unaffected: the filter lives in `src/common/` and imports only the `DomainError` type from the shared domain barrel created in `P02-04e` (type-only import, no domain logic in common).

### `P02-05b` — Register the filter globally and keep bootstrap order
- **Description**: Add `src/common/filters/index.ts` exporting the filter and register it in `src/main.ts` with `app.useGlobalFilters(new DomainExceptionFilter())`. Place the call after the global `ValidationPipe` registration from P01-05 and after `setupOpenApi(app)` from P01-08 so validation and docs routes keep their existing behaviour, and verify the hardened headers from P01-07 are still applied to problem responses. Do not move or duplicate other bootstrap calls. Atomic checks: (a) filter registered exactly once, (b) `useGlobalPipes`/`setupOpenApi`/`useSecurityHeaders` order unchanged, (c) `app.module.ts` untouched. Depends on `P02-05a`.
- **CLI(s)**: `npm run test:e2e -- domain-error-filter`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/filters/index.ts`
  - **Modified**: `src/main.ts`
  - **Deleted**: `None`
- **Branch**: `feat/api-domain-exception-filter` (shared)
- **Commit**: `feat(api): register global domain exception filter in bootstrap`
- **Testing**: E2E suite from `P02-05c` asserts problem responses still carry the P01-07 security headers; a regression assertion checks `main.ts` call order textually (`setupOpenApi` → `useGlobalFilters` → `useSecurityHeaders`). `npm run typecheck` passes.

### `P02-05c` — Add E2E coverage for each domain error class
- **Description**: Add `test/domain-error-filter.e2e-spec.ts` with a test-only controller that throws one of each `DomainError` subclass, a Nest `BadRequestException` and a plain `Error`. Assert the exact HTTP status per class (400/401/404/409), `Content-Type: application/problem+json`, the four problem fields, and that no response body contains `stack` or internal file paths. Include the negative path where a validation failure from a DTO becomes a 400 problem response. Atomic checks: (a) all four subclasses plus HttpException plus unknown error covered, (b) no stack traces in any body, (c) security headers present. Depends on `P02-05b`.
- **CLI(s)**: `npm run test:e2e -- domain-error-filter`; `npm run test:cov`.
- **Package(s)**: `None` — Supertest/Vitest from P01-02; fixtures from P01-03.
- **File(s)/Folder(s)**:
  - **Added**: `test/domain-error-filter.e2e-spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/api-domain-exception-filter` (shared)
- **Commit**: `test(api): cover domain error to http mapping end to end`
- **Testing**: The E2E spec uses a test-only controller (no production route added), asserts one deterministic problem body per error class and that unknown errors yield 500 with a generic message; `vi.fn()` spies on the filter's `catch` to confirm it was invoked once per request. Coverage thresholds pass.

### `P02-05d` — Add unit coverage for the filter's mapping table
- **Description**: Add `src/common/filters/domain-exception.filter.spec.ts` that drives `catch()` directly with `vi.fn()` mocks for `HttpResponse` (`status`, `json`, `setHeader`, `getResponse`) and an `ArgumentsHost` stub. Assert the complete mapping table from `DomainError.code` → status/title/detail, the `application/problem+json` content type, and that an unknown `Error` produces 500 with no stack/message leakage. Atomic checks: (a) all code→status rows asserted, (b) `vi.fn()` mocks for host/response, (c) no sensitive string in unknown-error output. This closes `P02-05`.
- **CLI(s)**: `npm run test:unit -- filter`; `npm run test:cov`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/filters/domain-exception.filter.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/api-domain-exception-filter` (shared)
- **Commit**: `test(api): assert domain error filter mapping with mocked responses`
- **Testing**: The spec calls `catch()` for each of the four subclasses, a `BadRequestException` and a plain `Error`, asserting exact `status`/`json` arguments on `vi.fn()` mocks; it fails if `stack` or an absolute path appears in any JSON payload. Coverage thresholds unchanged.

### `P02-06a` — Add the import scanner and inward-dependency guard
- **Description**: Create `test/architecture/lib/import-scanner.ts` exposing a pure `scanSource(source: string, file: string)` that returns every import declaration with its module specifier and line number, using the `typescript` compiler API already in devDependencies. Then add `test/architecture/inward-dependencies.spec.ts` that scans all `src/modules/<context>/**/*.ts` and enforces the layer map from §5.1: `domain/` may import only same-context `domain/` or `src/modules/shared/domain/`; `application/` may import `domain/` and port tokens but never `infrastructure/` or `interfaces/`; `infrastructure/` and `interfaces/` may import inward only. Any violation fails with file path and line number. Atomic checks: (a) scanner returns file+line, (b) all four layer rules asserted, (c) no cross-context outward import. Depends on the `P02-01` layout.
- **CLI(s)**: `mkdir -p test/architecture/lib`; `npm run test:arch`; `npx vitest run test/architecture/inward-dependencies.spec.ts`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `typescript` from devDependencies and Node built-ins (`node:fs`); no `dependency-cruiser` needed.
- **File(s)/Folder(s)**:
  - **Added**: `test/architecture/lib/import-scanner.ts`, `test/architecture/inward-dependencies.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `chore/test-architecture-guard` (shared with `P02-06b` … `P02-06e`)
- **Commit**: `chore(test): add inward-only dependency guard with import scanner`
- **Testing**: The spec asserts all four layer rules against the real `src/modules/**` tree and fails on an in-memory bad-import string fed to `scanSource()`; the failure message includes the file path and line. `npm run test:arch` is wired into CI in `P02-06e`.

### `P02-06b` — Add the domain purity guard
- **Description**: Add `test/architecture/domain-purity.spec.ts` scanning every `**/domain/**/*.ts` under `src/modules/` (including `src/modules/shared/domain/` from `P02-04`) and failing on any import from `@nestjs/*`, `typeorm`, `redis`, `ioredis`, `bullmq`, `express`, `class-validator`, `class-transformer` or any `**/infrastructure/**`, `**/interfaces/**` path. Allow only relative imports within `domain/` and the shared domain barrel. This is the static enforcement of the pure-domain rule stated in the lens for this step. Atomic checks: (a) every domain file scanned, (b) each forbidden namespace rejected, (c) clean domain files pass. Depends on `P02-06a`'s scanner.
- **CLI(s)**: `npm run test:arch -- domain-purity`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `test/architecture/lib/import-scanner.ts` from `P02-06a`.
- **File(s)/Folder(s)**:
  - **Added**: `test/architecture/domain-purity.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `chore/test-architecture-guard` (shared)
- **Commit**: `chore(test): add domain purity guard against framework imports`
- **Testing**: The spec iterates all domain files and fails on a forbidden import injected through a `vi.fn()`-stubbed `readFileSync`, asserting the reported namespace and line; it also asserts the four `P02-04` primitive files are scanned and pass. Coverage thresholds unchanged.

### `P02-06c` — Add the domain-free common guard
- **Description**: Add `test/architecture/common-domain-free.spec.ts` asserting no file under `src/common/**` (including the new filter from `P02-05a`) imports a path matching `src/modules/**/domain/**` or a relative path resolving into any context's `domain/` folder. A type-only import of the `DomainError` barrel is permitted, but any runtime domain import or business-rule symbol must fail; the spec uses the scanner's resolved specifier to distinguish the two. This enforces §5.2's "src/common is domain-free" rule for the whole repo. Atomic checks: (a) all `src/common/**` files scanned, (b) runtime domain import fails, (c) type-only import of shared domain barrel allowed. Depends on `P02-06a`.
- **CLI(s)**: `npm run test:arch -- common-domain-free`; `npm run typecheck`.
- **Package(s)**: `None` — reuses the scanner from `P02-06a`.
- **File(s)/Folder(s)**:
  - **Added**: `test/architecture/common-domain-free.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `chore/test-architecture-guard` (shared)
- **Commit**: `chore(test): assert src/common never imports context domain code`
- **Testing**: The spec scans `src/common/**` and fails on an injected runtime import using a `vi.fn()` file-reader stub; it explicitly passes the `import type { DomainError }` line in `domain-exception.filter.ts` from `P02-05a`, proving the distinction is real and not a blanket exception.

### `P02-06d` — Self-test the guard with a deliberate violation
- **Description**: Add `test/architecture/architecture-guard.selftest.spec.ts` proving the guards actually fail: feed `scanSource()` three in-memory source strings — a domain file importing `@nestjs/common`, an `application/` file importing `infrastructure/`, and a `src/common/` file importing a context `domain/` — and assert each produces a violation with the expected file path and line number. Also feed one clean source and assert zero violations, so the guards cannot be silently passing on empty input. No temporary files are written to `src/`. Atomic checks: (a) three deliberate violations detected, (b) clean source reports none, (c) no repo files mutated. Depends on `P02-06a`–`P02-06c`.
- **CLI(s)**: `npm run test:arch -- selftest`; `npm run test:unit`.
- **Package(s)**: `None` — pure in-memory strings plus `vi.fn()` stubs on the file reader.
- **File(s)/Folder(s)**:
  - **Added**: `test/architecture/architecture-guard.selftest.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `chore/test-architecture-guard` (shared)
- **Commit**: `test(arch): prove dependency guard fails on deliberate violations`
- **Testing**: The self-test asserts the exact violation count and that each message contains the file/line; a `vi.fn()` mock on `readFileSync` supplies the bad sources; the clean-source case guards against false negatives. Coverage thresholds unchanged.

### `P02-06e` — Wire the architecture guard into scripts and CI
- **Description**: Add a `test:arch` npm script running `vitest run test/architecture`, include it in the aggregate `test` script and in the CI workflow job so the Phase Gate cannot be green while an inward-only, purity or common-domain-free rule is broken. Update `vitest.config.ts` coverage settings so static architecture specs do not distort the configured source coverage thresholds. Atomic checks: (a) `test:arch` script present, (b) CI invokes it, (c) coverage thresholds unchanged and still enforced. This closes `P02-06` and the step.
- **CLI(s)**: `npm pkg set scripts.test:arch="vitest run test/architecture"`; `npm run test:arch`; `npm run test:cov`; `npm run typecheck`.
- **Package(s)**: `None` — no new devDependencies; reuses Vitest from P01-02.
- **File(s)/Folder(s)**:
  - **Added**: `None`
  - **Modified**: `package.json`, `package-lock.json`, `vitest.config.ts`, `.github/workflows/ci.yml`
  - **Deleted**: `None`
- **Branch**: `chore/test-architecture-guard` (shared)
- **Commit**: `chore(test): wire architecture guard into test script and CI`
- **Testing**: `npm run test:arch` runs all five architecture specs green; CI job definition asserts the script is called before the merge gate; `npm run test:cov` keeps the same thresholds with no new bypass. Security audit & version sync run at the Phase Gate.

## Phase Gate (end of step)

- [x] Full unit tests + coverage thresholds pass for entity, value object, result and domain error primitives.
- [x] E2E passes for every `DomainError` subclass plus `HttpException` and unknown-error paths, with no stack traces leaked.
- [x] `npm run test:arch` green: inward-only dependencies, domain purity, domain-free `src/common/`, and the deliberate-violation self-test all pass.
- [x] Domain layer contains no Nest/TypeORM/Redis/HTTP imports; `src/common/` contains no runtime context-domain imports.
- [x] Lint/format/typecheck clean; security audit & version sync run.
- [ ] Each atomic commit pushed on its shared branch; PRs merged into `dev` in this exact order:
  `P02-04a` → `P02-04b` → `P02-04c` → `P02-04d` → `P02-04e` → `P02-05a` → `P02-05b` → `P02-05c` → `P02-05d` → `P02-06a` → `P02-06b` → `P02-06c` → `P02-06d` → `P02-06e`.
- [ ] Status for umbrella IDs `P02-04`, `P02-05`, `P02-06` set to `✅ Done` in [`roadmap.md`](../../../roadmap.md) §4 (atomic IDs tracked here).
- [ ] Re-check the P02 exit criterion in [`roadmap.md`](../../../roadmap.md) §6.1 before starting the next step.
