# P01 · Step 2 — Typed Config & Secure Bootstrap

**Project:** nestjs-ddd  |  **Phase:** P01 — Foundation  |  **Base branch:** `dev`  |  **Status:** ✅ Done

> Source of truth: [`roadmap.md`](../../../roadmap.md) §4. Umbrella IDs `P01-04`, `P01-05`, `P01-06`, `P01-07` stay in the roadmap; this file lists the final atomic split (`P01-04a` … `P01-07c`).
> **Format**: `P<phase>-<umbrella><letter>` — one atomic task = one commit; sibling atomic tasks share one branch (branch per umbrella task). Every atomic task uses the 7-field format: `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing`.
> **Ordering notes**: (a) `P01-04a` defines the Joi schema and typed `Env` **without** wiring `ConfigModule`; `P01-04b` installs `@nestjs/config` and wires `validationSchema`, and `P01-04c` appends the first `registerAs` slice. (b) `P01-05a` creates the sample DTO later decorated with faker examples in `P01-09b`; `P01-05b` registers the global pipe on the `main.ts` insertion point created in `P01-01e`. (c) `P01-06b` reads `nodeEnv` from the app config slice of `P01-04c`; no secrets or PII may reach emitted log lines. (d) `P01-07a` adds `app.useSecurityHeaders()` to `main.ts`; `P01-08a` later inserts `setupOpenApi(app)` **immediately above** it — this ordering is a hard requirement and `P01-07c` guards the insertion point.

## DDD + SOLID lens for this step

- Use NestJS 12 first-party APIs over hand-rolled infrastructure.
- Config is small, typed and exported as `as Provider()` for async module options.
- No business rules in config, CI or docs; no secrets or PII committed.
- Tests use Vitest with `vi.fn()` mocks and faker fixtures.

## Step Summary

Add fail-fast Joi-validated typed environment config with `registerAs` slices exported as providers, register a global `ValidationPipe` with whitelist/transform, introduce a structured redacting logger (console in dev, JSON in prod), and harden the HTTP surface with native security headers and graceful shutdown hooks. All new config stays as small typed files under `src/common/config/`; nothing reads `process.env` outside that folder.

## Atomic Tasks

### `P01-04a` — Define the Joi schema, typed Env interface and validateEnv
- **Description**: Install Joi and create `src/common/config/validation/env.validation.ts` exporting a Joi object schema covering `PORT` (integer 1–65535), `NODE_ENV` (`development`/`test`/`production`), plus placeholder keys reserved for later phases (mail, Redis, JWT key paths) with safe defaults where appropriate. Export `validateEnv(config: Record<string, unknown>)` that throws a summarised error on missing/invalid values, and a typed `Env` interface in `src/common/config/env.interface.ts` inferred from the schema. Do not touch `ConfigModule.forRoot` — that is `P01-04b`. Atomic checks: (a) Joi schema present, (b) `Env` typed and inferred, (c) `validateEnv` throws on invalid `PORT` and unknown `NODE_ENV`. This is the prerequisite for `P01-04b` and the config-slice atomics.
- **CLI(s)**: `npm install joi`; `npm run test:unit`.
- **Package(s)**: installed as `dependency`: `joi` (ships its own typings; no `@types/joi` needed).
- **File(s)/Folder(s)**:
  - **Added**: `src/common/config/validation/env.validation.ts`, `src/common/config/validation/env.validation.spec.ts`, `src/common/config/env.interface.ts`
  - **Modified**: `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `feat/config-typed-env-joi` (shared with `P01-04b` … `P01-04e`)
- **Commit**: `feat(config): add joi env schema typed env and validateenv`
- **Testing**: `src/common/config/validation/env.validation.spec.ts` calls `validateEnv` with a valid object (passes), `PORT: 'abc'` (throws), missing `NODE_ENV` (throws) and `NODE_ENV: 'staging'` (throws). Uses `vi.fn()` only on a spy for the error reporter if one is added; no application spec outside config. `npm run typecheck` confirms `Env` inference.

### `P01-04b` — Add the core ConfigModule wired with validationSchema
- **Description**: Install `@nestjs/config` and add `src/common/config/config.module.ts` exporting a global `ConfigModule.forRoot({ isGlobal: true, validationSchema: validateEnv, envFilePath: '.env', expandVariables: true })`; import it into `src/app.module.ts`. The `load` array starts empty — `P01-04c` appends the first `registerAs` provider. This is the first atomic that makes invalid env fail at bootstrap using the schema from `P01-04a`. Atomic checks: (a) `@nestjs/config` installed, (b) global ConfigModule with `validationSchema`, (c) `PORT=abc npm run start` exits non-zero before listening. Follows `P01-04a`.
- **CLI(s)**: `npm install @nestjs/config`; `NODE_ENV=development npm run test:unit`; `PORT=abc NODE_ENV=development npm run start` (must fail fast).
- **Package(s)**: installed as `dependency`: `@nestjs/config` (first-party Nest package).
- **File(s)/Folder(s)**:
  - **Added**: `src/common/config/config.module.ts`, `src/common/config/config.module.spec.ts`
  - **Modified**: `src/app.module.ts`, `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `feat/config-typed-env-joi` (shared)
- **Commit**: `feat(config): add core configmodule with joi validation wired`
- **Testing**: `src/common/config/config.module.spec.ts` compiles a `Test.createTestingModule({ imports: [ConfigModule] })` with a valid env and asserts an invalid `PORT` rejects with the Joi error; negative CLI smoke above must not bind a port. Coverage thresholds pass.

### `P01-04c` — Add the app config slice with registerAs as a Provider
- **Description**: Add `src/common/config/app.config.ts` using `registerAs('app', ...)` for `port`, `nodeEnv` and `apiPrefix`, typed from `Env` (`P01-04a`) and exported so it can be consumed as `as Provider()` in `.forRootAsync()` / `.registerAsync()` options. Append `appConfig` to the empty `load` array in `src/common/config/config.module.ts`. This is the "typed app config slice" later read by `P01-06b` (logger), `P01-08b` (admin docs production guard) and future modules. Atomic checks: (a) `registerAs('app')` present, (b) small typed file, (c) injectable via `as Provider()` in a testing module. Follows `P01-04b`.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `@nestjs/config` from `P01-04b`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/config/app.config.ts`, `src/common/config/app.config.spec.ts`
  - **Modified**: `src/common/config/config.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/config-typed-env-joi` (shared)
- **Commit**: `feat(config): add typed app config slice with registeras provider`
- **Testing**: `src/common/config/app.config.spec.ts` calls `appConfig()` and asserts typed values for `port`/`nodeEnv`/`apiPrefix`, then injects it through `Test.createTestingModule({ providers: [appConfig as Provider] })` and asserts `ConfigService.get('app.port')` returns the number. `vi.fn()` used if a fetcher is mocked; no business logic in the file.

### `P01-04d` — Add .env.example with placeholders and no secrets
- **Description**: Add `.env.example` listing every key accepted by the `P01-04a` schema with non-sensitive placeholder values (e.g. `PORT=3000`, `NODE_ENV=development`, empty placeholder paths for later phases) and a short header comment pointing developers to copy it to `.env`, which remains gitignored from `P0-01a`. Add a spec that reads the file and asserts every required schema key appears and that no obvious secret/PII patterns (real domains, `password=` with a value, private-key headers) are present. Atomic checks: (a) all required keys documented, (b) placeholders only, (c) `.env` still ignored. Follows `P01-04a`/`P01-04c`.
- **CLI(s)**: `npm run test:unit`; `git check-ignore .env`.
- **Package(s)**: `None` — Node built-ins in the spec (`node:fs`, `node:path`).
- **File(s)/Folder(s)**:
  - **Added**: `.env.example`, `src/common/config/env.example.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/config-typed-env-joi` (shared)
- **Commit**: `chore(config): add env example with placeholders and no secrets`
- **Testing**: `src/common/config/env.example.spec.ts` parses `.env.example`, asserts the key set equals the required schema keys minus optional placeholders, and runs a no-secret regex scan; `vi.fn()` on `fs.readFileSync` if the spec stubs the filesystem. No E2E needed.

### `P01-04e` — Add fail-fast E2E and a no-raw-process.env guard spec
- **Description**: Add `test/env-validation.e2e-spec.ts` asserting that booting the app with `NODE_ENV=production PORT=not-a-number` exits before the HTTP server listens and that a valid env boots normally. Add `src/common/config/no-raw-env.spec.ts` that scans `src/` excluding `src/common/config/` for `process.env` usage and fails on any hit, enforcing roadmap rule "no raw `process.env` outside config". Atomic checks: (a) invalid env fails fast in E2E, (b) valid env boots, (c) no raw `process.env` outside config. Follows `P01-04b` and completes `P01-04`.
- **CLI(s)**: `NODE_ENV=production PORT=not-a-number npm run test:e2e -- env-validation`; `NODE_ENV=development npm run test:e2e -- env-validation`; `npm run test:unit`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `test/env-validation.e2e-spec.ts`, `src/common/config/no-raw-env.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/config-typed-env-joi` (shared)
- **Commit**: `test(config): assert env fail fast and no raw process env usage`
- **Testing**: `test/env-validation.e2e-spec.ts` spawns the bootstrap path with a bad env and asserts a non-zero exit without a listening server; `src/common/config/no-raw-env.spec.ts` walks `src/` with `vi.fn()` on `fs` reads and asserts zero matches outside `src/common/config/`. Coverage thresholds pass.

### `P01-05a` — Install validation packages and create the example DTO
- **Description**: Install `class-validator` and `class-transformer`, then add `src/common/dto/example.dto.ts` with a small validated DTO (e.g. `name` `@IsString()` `@IsNotEmpty()`, `email` `@IsEmail()`, `age` `@IsInt()` `@Min(0)`) plus a spec validating a good and a bad payload with `validateSync()`. No Swagger decorators or faker examples yet — those come in `P01-09b`; no business rules in the DTO. Atomic checks: (a) both packages installed, (b) DTO has decorators, (c) bad payload produces errors. This is the prerequisite for `P01-05c`'s E2E spec.
- **CLI(s)**: `npm install class-validator class-transformer`; `npm run test:unit`.
- **Package(s)**: installed as `dependencies`: `class-validator`, `class-transformer`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/dto/example.dto.ts`, `src/common/dto/example.dto.spec.ts`
  - **Modified**: `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `feat/config-global-validation` (shared with `P01-05b`, `P01-05c`)
- **Commit**: `feat(config): add class-validator packages and example dto`
- **Testing**: `src/common/dto/example.dto.spec.ts` uses `validateSync()` to assert a valid object passes and an invalid email/negative age produce constraint errors; no `vi.fn()` needed for pure validation.

### `P01-05b` — Register the global ValidationPipe with whitelist and transform
- **Description**: Add `src/common/config/validation-pipe.config.ts` exporting the pipe options (`whitelist: true`, `transform: true`, `forbidNonWhitelisted: true`) as a small typed config value consumable with `as Provider()`, and register it in `src/main.ts` via `app.useGlobalPipes(new ValidationPipe(validationPipeOptions))`. Place the registration on the same `main.ts` bootstrap insertion point created by `P01-01e`, before the later security-header and docs calls. Do not bypass validation for any route. Atomic checks: (a) pipe registered globally, (b) all three flags enabled, (c) options live in a typed config file, not inline business logic. Follows `P01-05a`.
- **CLI(s)**: `npm run typecheck`; `npm run test:unit`.
- **Package(s)**: `None` — reuses `class-validator`/`class-transformer` from `P01-05a`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/config/validation-pipe.config.ts`, `src/common/config/validation-pipe.config.spec.ts`
  - **Modified**: `src/main.ts`
  - **Deleted**: `None`
- **Branch**: `feat/config-global-validation` (shared)
- **Commit**: `feat(config): register global validationpipe with whitelist and transform`
- **Testing**: `src/common/config/validation-pipe.config.spec.ts` asserts the exported options object has all three flags true and can be injected via `as Provider()`; `npm run typecheck` passes on the new `main.ts` call.

### `P01-05c` — Add E2E coverage for validation, whitelist and transform
- **Description**: Add `test/validation.e2e-spec.ts` with a test-only controller that accepts the `ExampleDto` from `P01-05a` and echoes it back. Assert: unknown field → 400 via `forbidNonWhitelisted`, missing required field → 400, well-formed payload → 200 with the body transformed into a DTO instance (numeric `age` coerced from string via `transform: true`). Use a `vi.fn()` service collaborator to prove the controller receives a validated instance. Atomic checks: (a) extra field rejected, (b) missing field rejected, (c) transform observed. Follows `P01-05b` and completes `P01-05`.
- **CLI(s)**: `npm run test:e2e -- validation`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `test/validation.e2e-spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/config-global-validation` (shared)
- **Commit**: `test(config): cover validation pipe whitelist transform and 400s`
- **Testing**: `test/validation.e2e-spec.ts` uses Supertest against a test-only controller, a `vi.fn()` spy on the echo service to assert it was called with an `ExampleDto` instance, and negative assertions for 400 responses. Coverage thresholds pass.

### `P01-06a` — Add the secret/PII redaction utility
- **Description**: Add `src/common/logger/redact.ts` exporting `redact(value: unknown): unknown` that recursively replaces values for sensitive keys (`password`, `token`, `authorization`, `secret`, `apiKey`, `refreshToken`, `accessToken`, `ssn`, `email` and common PII names) with `[REDACTED]`, without mutating the input. Keep it framework-free and add no dependencies. Atomic checks: (a) sensitive keys redacted, (b) nested objects covered, (c) original object unchanged. This is the prerequisite for `P01-06b`.
- **CLI(s)**: `npm run test:unit`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/logger/redact.ts`, `src/common/logger/redact.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/core-structured-logger` (shared with `P01-06b`, `P01-06c`)
- **Commit**: `feat(core): add recursive secret and pii redaction utility`
- **Testing**: `src/common/logger/redact.spec.ts` asserts nested `password`/`accessToken`/`email` become `[REDACTED]`, non-sensitive keys survive, and `Object.freeze` input is not mutated; no `vi.fn()` needed.

### `P01-06b` — Add the structured logger service (console dev, JSON prod)
- **Description**: Add `src/common/logger/structured-logger.service.ts` implementing Nest's `LoggerService` (`log`, `error`, `warn`, `debug`, `verbose`), reading `nodeEnv` from `appConfig` (`P01-04c`) via `ConfigService` and passing every message/context/meta through `redact()` from `P01-06a`. In `development`/`test` write human-readable lines via `console`; in `production` write single-line JSON to stdout/stderr. Add a `LoggerModule` providing and exporting the service. Atomic checks: (a) implements `LoggerService`, (b) env switch observable, (c) no secret/PII in emitted output. Follows `P01-06a` and `P01-04c`.
- **CLI(s)**: `npm run test:unit`; `NODE_ENV=production npm run test:unit -- logger`.
- **Package(s)**: `None` — uses `@nestjs/common` `LoggerService` from `P01-01a` and `@nestjs/config` from `P01-04b`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/logger/structured-logger.service.ts`, `src/common/logger/structured-logger.service.spec.ts`, `src/common/logger/logger.module.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/core-structured-logger` (shared)
- **Commit**: `feat(core): add env-aware structured logger with redaction`
- **Testing**: `src/common/logger/structured-logger.service.spec.ts` stubs `ConfigService.get` with `vi.fn()` returning `development` vs `production`, spies on `console.log`/`process.stdout.write` with `vi.fn()`, and asserts JSON output in prod, text in dev, and `[REDACTED]` wherever a token was passed as meta.

### `P01-06c` — Wire the logger in bootstrap and assert redaction end-to-end
- **Description**: Import `LoggerModule` into `src/app.module.ts` and set the structured logger as the application logger in `src/main.ts` via `NestFactory.create(AppModule, { logger: ... })`. Add `test/logger.e2e-spec.ts` that triggers a request carrying a fake token in a header and asserts the captured log output contains `[REDACTED]` and not the token value. Do not log request bodies wholesale. Atomic checks: (a) logger wired at bootstrap, (b) E2E log capture shows redaction, (c) no secret in logs. Follows `P01-06b` and completes `P01-06`.
- **CLI(s)**: `NODE_ENV=development npm run test:e2e -- logger`; `NODE_ENV=production npm run test:e2e -- logger`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `test/logger.e2e-spec.ts`
  - **Modified**: `src/main.ts`, `src/app.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/core-structured-logger` (shared)
- **Commit**: `feat(core): wire structured logger and assert redaction in logs`
- **Testing**: `test/logger.e2e-spec.ts` boots the app, sends a header `authorization: Bearer fake-token-123`, and asserts the captured log line includes `[REDACTED]` and excludes `fake-token-123`; a `vi.fn()` spy on the logger service records calls. Run in both dev and prod env modes.

### `P01-07a` — Add native security headers via useSecurityHeaders
- **Description**: Call `app.useSecurityHeaders()` (NestJS 12 native API from `@nestjs/core`; **no `helmet`**) in `src/main.ts` with hardened defaults (CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, HSTS in production only). Add `test/security-headers.e2e-spec.ts` asserting those headers on both `GET /health` and error responses. Leave an explicit comment that `P01-08a` will insert `setupOpenApi(app)` on the line immediately **above** this call so docs routes are mounted before headers are applied. Atomic checks: (a) native method invoked, (b) headers present on success and error, (c) no `helmet` dependency. This is the prerequisite for `P01-07b`/`P01-07c` and for the hard ordering requirement of `P01-08a`.
- **CLI(s)**: `npm run test:e2e -- security-headers`; `npm run typecheck`.
- **Package(s)**: `None` — uses native `app.useSecurityHeaders()` from `@nestjs/core`/`@nestjs/platform-express`; explicitly do **not** install `helmet`.
- **File(s)/Folder(s)**:
  - **Added**: `test/security-headers.e2e-spec.ts`
  - **Modified**: `src/main.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-headers-graceful-shutdown` (shared with `P01-07b`, `P01-07c`)
- **Commit**: `feat(sec): add native security headers via usesecurityheaders`
- **Testing**: `test/security-headers.e2e-spec.ts` asserts `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` and (in production) `Strict-Transport-Security` on both a 200 and a 404 response; no `vi.fn()` needed for header assertions.

### `P01-07b` — Enable graceful shutdown hooks
- **Description**: Call `app.enableShutdownHooks()` in `src/main.ts` immediately after the security-header call so Nest propagates `SIGTERM`/`SIGINT` to lifecycle hooks. Add `src/common/lifecycle/drain.service.ts` implementing `OnApplicationShutdown` with an injectable `vi.fn()`-friendly collaborator that records the drain, and add `test/shutdown.e2e-spec.ts` that boots the app, emits `SIGTERM` and asserts the server stops accepting connections after the drain completes. Atomic checks: (a) `enableShutdownHooks()` present, (b) shutdown hook invoked, (c) server stops cleanly. Follows `P01-07a`.
- **CLI(s)**: `npm run test:unit`; `npm run test:e2e -- shutdown`.
- **Package(s)**: `None` — uses `OnApplicationShutdown` from `@nestjs/common`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/lifecycle/drain.service.ts`, `src/common/lifecycle/drain.service.spec.ts`, `test/shutdown.e2e-spec.ts`
  - **Modified**: `src/main.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-headers-graceful-shutdown` (shared)
- **Commit**: `feat(sec): enable graceful shutdown hooks with drain service`
- **Testing**: `src/common/lifecycle/drain.service.spec.ts` calls `onApplicationShutdown('SIGTERM')` and asserts a `vi.fn()` collaborator was called once; `test/shutdown.e2e-spec.ts` sends `SIGTERM` and asserts the HTTP server closes and a new request fails.

### `P01-07c` — Add combined secure-bootstrap coverage and insertion-point guard
- **Description**: Add `test/secure-bootstrap.e2e-spec.ts` covering the assembled bootstrap in both `NODE_ENV=development` and `NODE_ENV=production`: hardened headers on responses, graceful shutdown still working, global validation still rejecting unknown fields, and structured logs still redacted. Add a source-level assertion that `main.ts` contains `useSecurityHeaders()` before `enableShutdownHooks()` and that the line immediately above `useSecurityHeaders()` is reserved for `setupOpenApi(app)` from `P01-08a`. This is the guard that prevents the Step 3 docs work from breaking the "Swagger before security headers" rule. Atomic checks: (a) four concerns covered in one suite, (b) call order asserted, (c) insertion point documented and empty for now. Follows `P01-07b` and completes `P01-07`.
- **CLI(s)**: `NODE_ENV=development npm run test:e2e -- secure-bootstrap`; `NODE_ENV=production npm run test:e2e -- secure-bootstrap`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `test/secure-bootstrap.e2e-spec.ts`, `src/main.bootstrap-order.spec.ts`
  - **Modified**: `test/security-headers.e2e-spec.ts`, `test/shutdown.e2e-spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-headers-graceful-shutdown` (shared)
- **Commit**: `test(sec): cover secure bootstrap and guard swagger insertion point`
- **Testing**: `test/secure-bootstrap.e2e-spec.ts` runs both env modes and asserts header + shutdown + validation + redaction behaviour; `src/main.bootstrap-order.spec.ts` reads `src/main.ts` with `vi.fn()` on `fs.readFileSync` and asserts the index order `useGlobalPipes` < `useSecurityHeaders` < `enableShutdownHooks`, with no `setupOpenApi` call yet. Coverage thresholds pass.

## Phase Gate (end of step)

- [x] Full unit tests + coverage thresholds pass (`test:unit`, `test:cov`) and E2E passes (`test:e2e`) in both development and production env modes.
- [x] Conformance specs pass for every adapter of any touched port — no ports are introduced in this step, so this is vacuously true; logger/redaction and config specs pass.
- [x] Invalid env fails fast at boot; no raw `process.env` outside `src/common/config/`; `.env.example` contains placeholders only and no secrets or PII are committed.
- [x] `npm run typecheck`, `npm run lint`, `npm run format:check` clean; security audit & version sync run.
- [x] `main.ts` order confirmed: global pipe → (`setupOpenApi` inserted by `P01-08a`) → `useSecurityHeaders` → `enableShutdownHooks`; no `helmet` installed.
- [x] Each atomic commit pushed on its shared branch; PRs merged into `dev` in this exact order:
  `P01-04a` → `P01-04b` → `P01-04c` → `P01-04d` → `P01-04e` → `P01-05a` → `P01-05b` → `P01-05c` → `P01-06a` → `P01-06b` → `P01-06c` → `P01-07a` → `P01-07b` → `P01-07c`.
- [x] Status for umbrella IDs `P01-04`, `P01-05`, `P01-06`, `P01-07` set to `✅ Done` in [`roadmap.md`](../../../roadmap.md) §4 (atomic IDs tracked here).
- [x] Re-check the P01 exit criterion in [`roadmap.md`](../../../roadmap.md) §6.1 before starting Step 3.
