# P03 · Step 4 — Platform Clients & Basic Controls

**Project:** nestjs-ddd  |  **Phase:** P03 — Data & Infrastructure  |  **Base branch:** `dev`  |  **Status:** ✅ Done

> Source of truth: [`roadmap.md`](../../../roadmap.md) §4. Umbrella IDs `P03-10`, `P03-11`, `P03-12`, `P03-13` stay in the roadmap; this file lists the final atomic split (`P03-10a` … `P03-13c`).
> **Format**: `P<phase>-<umbrella><letter>` — one atomic task = one commit; sibling atomic tasks share one branch (branch per umbrella). Every atomic task uses the 7-field format: `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing`.
> **Ordering notes**: (a) `P03-10a` (config) → `P03-10b` (HTTP_CLIENT port) → `P03-10c` (first-party `@nestjs/axios` adapter) → `P03-10d` (conformance + error mapping). (b) `P03-11a` → `P03-11b` registers the throttler globally; `P03-12a` → `P03-12b` builds idempotency on the CACHE port from `P03-04b` rather than introducing a redundant port. (c) `P03-13a` → `P03-13b` adds the CIRCUIT_BREAKER port and in-process adapter, then `P03-13c` decorates the HTTP client from `P03-10c`; P09-02 may swap the adapter behind the same port, so no use case changes later.

## DDD + SOLID lens for this step

- Bounded contexts own `domain/`, `application/`, `infrastructure/`, `interfaces/`; dependencies point inward.
- Domain/application depend only on port tokens; adapters are injected, never imported directly.
- Every port ships one conformance spec run against all adapters, including in-memory fallbacks.
- Business rules live in entities/value objects/use cases; controllers stay thin.
- Introduce a port only when a mechanism must be swappable or isolated for tests.

## Step Summary

Add a first-party HTTP client adapter behind a narrow port with safe error mapping, register basic global throttling, add idempotency middleware backed by the existing CACHE port, and add a basic circuit breaker behind its own port wrapping outbound calls — all configured by small typed `as Provider()` slices with no external services required.

## Atomic Tasks

### `P03-10a` — Add the typed, validated HTTP client config slice
- **Description**: Create `src/common/config/http.config.ts` using `registerAs('http', ...)` with `timeoutMs`, `maxRedirects`, `retryAttempts`, `baseHeaders` and `userAgent`, exported as a typed `as Provider()` value for `HttpModule.registerAsync()`. Extend the Joi env schema from `P01-04` with `HTTP_TIMEOUT_MS`, `HTTP_MAX_REDIRECTS` and `HTTP_RETRY_ATTEMPTS`, failing fast on invalid values and never storing secrets in `baseHeaders`. Config holds data only — retry/backoff policy is enforced by the adapter and breaker in `P03-10c`/`P03-13c`; this atomic must land first. Atomic checks: (a) typed `registerAs('http')` namespace, (b) Joi rejects a negative timeout, (c) no secret in the serialised config.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `@nestjs/config` and `joi` from `P01-04`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/config/http.config.ts`, `src/common/config/http.config.spec.ts`
  - **Modified**: `src/common/config/env.validation.ts`, `src/common/config/config.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/infra-http-client` (shared with `P03-10b` … `P03-10d`)
- **Commit**: `feat(infra): add typed http client config slice with joi validation`
- **Testing**: `http.config.spec.ts` asserts typed fields, the timeout default and `as Provider()` injection; a `vi.fn()` env spy proves validated-only reads and a redaction assertion checks no secrets; coverage thresholds unchanged.

### `P03-10b` — Define the HTTP_CLIENT port and DI token
- **Description**: Add `src/modules/shared/ports/http-client.port.ts` with a narrow `HttpClientPort` (`request<T>(options: HttpRequestOptions): Promise<T>` plus `get`/`post` thin wrappers) and a single `HTTP_CLIENT_PORT` token, keeping Axios types out of the seam so consumers can inject `vi.fn()` mocks. Define `HttpRequestOptions` and a domain-safe `HttpError` type with no response bodies or headers carrying PII. This atomic gates `P03-10c` and must precede the conformance suite in `P03-10d`. Atomic checks: (a) one token, narrow methods, (b) zero axios imports in the port, (c) error type carries only status + safe message.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/ports/http-client.port.ts`, `src/modules/shared/ports/http-client.port.spec.ts`, `src/modules/shared/domain/http-error.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/infra-http-client` (shared)
- **Commit**: `feat(infra): add http client port and di token in shared kernel`
- **Testing**: `http-client.port.spec.ts` type-checks a dummy implementation, asserts a unique token and uses a `vi.fn()` static scan to prove no Axios import; `HttpError` spec asserts status/message construction; coverage thresholds pass.

### `P03-10c` — Implement the first-party HTTP client adapter
- **Description**: Add `src/modules/shared/infrastructure/http/axios-http-client.adapter.ts` implementing `HttpClientPort` using the first-party `HttpModule.registerAsync()` from `@nestjs/axios` with the config provider from `P03-10a`, applying timeout, redirects, base headers and a correlation-id interceptor. Bind it to `HTTP_CLIENT_PORT` in `src/modules/shared/infrastructure/http/http-client.module.ts` and import it into `src/app.module.ts`. This atomic depends on `P03-10b` and supplies the adapter that `P03-10d` conforms and `P03-13c` wraps. Atomic checks: (a) first-party `HttpModule` used, (b) timeout/headers applied, (c) adapter reachable only via the token.
- **CLI(s)**: `npm install @nestjs/axios axios`; `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: installed with `npm install @nestjs/axios axios` (first-party Nest HTTP module and its client).
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/infrastructure/http/axios-http-client.adapter.ts`, `src/modules/shared/infrastructure/http/axios-http-client.adapter.spec.ts`, `src/modules/shared/infrastructure/http/http-client.module.ts`
  - **Modified**: `src/app.module.ts`, `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `feat/infra-http-client` (shared)
- **Commit**: `feat(infra): add first-party http client adapter`
- **Testing**: `axios-http-client.adapter.spec.ts` mocks the Axios instance with `vi.fn()` and asserts method, URL, timeout, base headers and correlation id; a success spec asserts typed response mapping; coverage thresholds unchanged.

### `P03-10d` — Add the HTTP client conformance spec and safe error mapping
- **Description**: Create `src/modules/shared/infrastructure/http/http-client.conformance.spec.ts` with the `P02-03` harness over an `HttpClientPort` factory, covering successful GET/POST, timeout, non-2xx status and network failure in one unchanged suite. Map Axios timeouts, HTTP status errors and network errors to the domain-safe `HttpError` from `P03-10b`, stripping response bodies and sensitive headers so no PII, token or upstream detail leaks into logs or rethrows. This atomic depends on `P03-10c` and closes the HTTP_CLIENT port's adapter coverage. Atomic checks: (a) one shared spec, adapter passes unchanged, (b) all three error classes map to `HttpError`, (c) no sensitive field in thrown error or log output.
- **CLI(s)**: `npm run test:unit -- http`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/infrastructure/http/http-client.conformance.spec.ts`
  - **Modified**: `src/modules/shared/infrastructure/http/axios-http-client.adapter.ts`, `src/modules/shared/infrastructure/http/axios-http-client.adapter.spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/infra-http-client` (shared)
- **Commit**: `test(infra): conform http client and add safe error mapping`
- **Testing**: The conformance spec asserts identical results for success and all failure modes using `vi.fn()` mocks; a dedicated redaction spec asserts thrown `HttpError` and captured logs contain no `Authorization`, token or body fields; coverage threshold ≥90% lines/branches on the adapter.

### `P03-11a` — Add the typed, validated throttler config slice
- **Description**: Create `src/common/config/throttler.config.ts` using `registerAs('throttler', ...)` with `ttlMs`, `limit` and `storage: 'memory'`, exported as a typed `as Provider()` value for `ThrottlerModule.forRootAsync()`. Wire it into Joi from `P01-04` with `THROTTLE_TTL_MS` and `THROTTLE_LIMIT` so invalid values fail fast. Keep Redis-backed/distributed storage and sliding-window rules out of scope here — they are P09 hardening; this atomic must land before `P03-11b`. Atomic checks: (a) typed `registerAs('throttler')` namespace, (b) Joi rejects a zero limit, (c) in-memory storage is the documented default.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `@nestjs/config` and `joi` from `P01-04`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/config/throttler.config.ts`, `src/common/config/throttler.config.spec.ts`
  - **Modified**: `src/common/config/env.validation.ts`, `src/common/config/config.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/infra-throttler-basic` (shared with `P03-11b`, `P03-11c`)
- **Commit**: `feat(infra): add typed throttler config slice with joi validation`
- **Testing**: `throttler.config.spec.ts` asserts typed values, defaults and `as Provider()` injection; a `vi.fn()` env spy proves validated reads; coverage thresholds unchanged.

### `P03-11b` — Register the global throttler
- **Description**: Install `@nestjs/throttler` and register `ThrottlerModule.forRootAsync()` in `src/app.module.ts` using the typed provider from `P03-11a`, then provide `ThrottlerGuard` as an `APP_GUARD` so all routes are limited by default. Do not add per-route business exceptions here; only mark docs/health routes with `@Throttle({ default: false })` where required for operability. This atomic depends on `P03-11a` and gates the E2E in `P03-11c`. Atomic checks: (a) async module uses the config provider, (b) guard bound globally via `APP_GUARD`, (c) no hand-rolled rate counter.
- **CLI(s)**: `npm install @nestjs/throttler`; `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: installed with `npm install @nestjs/throttler` (first-party Nest throttler module).
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/infrastructure/throttler/throttler.module.ts`
  - **Modified**: `src/app.module.ts`, `package.json`, `package-lock.json`, `src/main.ts` (only if ordering of guards must be pinned)
  - **Deleted**: `None`
- **Branch**: `feat/infra-throttler-basic` (shared)
- **Commit**: `feat(infra): register global throttler with typed config`
- **Testing**: A module-compile spec uses `vi.fn()` on `ThrottlerModule.forRootAsync` to assert the config token is injected and `APP_GUARD` is bound exactly once; coverage thresholds pass.

### `P03-11c` — Add the throttling E2E spec
- **Description**: Add an E2E that issues `limit + 1` requests to a test-only route and asserts the first `limit` succeed with 2xx and the next returns 429 with a `Retry-After` header; assert that an opted-out health/docs route from `P03-11b` is not throttled. Use a fresh app instance per test so counters do not leak, and seeded faker values from `P01-03` for any payloads. This atomic depends on `P03-11b` and completes the P03-11 umbrella. Atomic checks: (a) 429 after the configured limit, (b) `Retry-After` present, (c) excluded route unaffected.
- **CLI(s)**: `npm run test:e2e -- throttler`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `test/throttler.e2e-spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/infra-throttler-basic` (shared)
- **Commit**: `test(infra): cover global throttling and 429 response`
- **Testing**: `test/throttler.e2e-spec.ts` asserts status codes, `Retry-After`, and a `vi.fn()` handler call count proving the request was rejected before the handler ran; coverage thresholds met.

### `P03-12a` — Add the typed, validated idempotency config slice
- **Description**: Create `src/common/config/idempotency.config.ts` using `registerAs('idempotency', ...)` with `headerName: 'Idempotency-Key'`, `keyPrefix: 'nestjs-ddd:idem:'`, `ttlSeconds` and `enabledRoutes` (a list of method+path patterns), exported as a typed `as Provider()` value. Extend Joi env validation with `IDEMPOTENCY_TTL_SECONDS` and default the header/prefix as above. The list selects where the middleware applies; it is data, not a business rule, and the fingerprint logic stays in `P03-12b`. This atomic must land before `P03-12b`. Atomic checks: (a) typed `registerAs('idempotency')` namespace, (b) Joi rejects a non-positive TTL, (c) default header and prefix literal values.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `@nestjs/config` and `joi` from `P01-04`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/config/idempotency.config.ts`, `src/common/config/idempotency.config.spec.ts`
  - **Modified**: `src/common/config/env.validation.ts`, `src/common/config/config.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/infra-idempotency-basic` (shared with `P03-12b`, `P03-12c`)
- **Commit**: `feat(infra): add typed idempotency config slice with joi validation`
- **Testing**: `idempotency.config.spec.ts` asserts typed fields, literal header/prefix defaults and `as Provider()` injection; a `vi.fn()` env spy proves validated reads; coverage thresholds unchanged.

### `P03-12b` — Implement idempotency middleware on the CACHE port
- **Description**: Add `src/common/middleware/idempotency.middleware.ts` that computes a fingerprint from method + path + body, reads/writes `fingerprint → serialised response` through the existing `CACHE_PORT` from `P03-04b` with the configured TTL, and short-circuits a replay with the stored status/body. Reuse the cache port instead of adding a redundant store port, and keep the middleware domain-free — it detects replays but decides no business outcome. Register it globally in `src/main.ts` after the `P01-05` validation pipe. This atomic depends on `P03-12a` and `P03-04b` and gates the E2E in `P03-12c`. Atomic checks: (a) cache port used via token, (b) fingerprint includes body, (c) `nestjs-ddd:idem:` prefix applied via the cache namespace.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `CACHE_PORT` from `P03-04b` and the cache adapters from `P03-04c`/`P03-05a`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/middleware/idempotency.middleware.ts`, `src/common/middleware/idempotency.middleware.spec.ts`
  - **Modified**: `src/main.ts`
  - **Deleted**: `None`
- **Branch**: `feat/infra-idempotency-basic` (shared)
- **Commit**: `feat(infra): add idempotency middleware backed by cache port`
- **Testing**: `idempotency.middleware.spec.ts` uses `vi.fn()` on `CachePort.get/set` to assert key format, TTL, stored response and short-circuit behaviour; a different-body case asserts a different fingerprint; coverage thresholds pass.

### `P03-12c` — Add the idempotency replay E2E
- **Description**: Add an E2E with a test-only POST route whose handler is a `vi.fn()` spy: send the same `Idempotency-Key` twice and assert the handler runs once and both responses are identical; send the same key with a different body and assert it is treated as a distinct request; advance fake timers past the TTL and assert a third identical request re-executes the handler. Run with the in-memory cache fallback to keep zero external services. This atomic depends on `P03-12b` and completes the P03-12 umbrella. Atomic checks: (a) replay returns cached result, (b) body change invalidates, (c) TTL expiry allows re-execution.
- **CLI(s)**: `npm run test:e2e -- idempotency`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `test/idempotency.e2e-spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/infra-idempotency-basic` (shared)
- **Commit**: `test(infra): cover idempotency replay, body change and ttl`
- **Testing**: `test/idempotency.e2e-spec.ts` asserts response equality, `vi.fn()` handler call counts (1 after replay, 2 after TTL) and that a body change produces a new execution; coverage thresholds met.

### `P03-13a` — Add the typed, validated resilience config slice
- **Description**: Create `src/common/config/resilience.config.ts` using `registerAs('resilience', ...)` with `failureThreshold`, `resetTimeoutMs`, `halfOpenMaxCalls` and `enabled: true`, exported as a typed `as Provider()` value. Extend Joi from `P01-04` with `BREAKER_FAILURE_THRESHOLD`, `BREAKER_RESET_TIMEOUT_MS` and `BREAKER_HALF_OPEN_MAX_CALLS`. This is basic configuration only — per-provider policies and full hardening belong to P09-02 — and this atomic must land before `P03-13b`. Atomic checks: (a) typed `registerAs('resilience')` namespace, (b) Joi rejects a zero threshold, (c) no business rules in config.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `@nestjs/config` and `joi` from `P01-04`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/config/resilience.config.ts`, `src/common/config/resilience.config.spec.ts`
  - **Modified**: `src/common/config/env.validation.ts`, `src/common/config/config.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/infra-resilience-basic` (shared with `P03-13b`, `P03-13c`)
- **Commit**: `feat(infra): add typed resilience config slice with joi validation`
- **Testing**: `resilience.config.spec.ts` asserts typed values, defaults and `as Provider()` injection; a `vi.fn()` env spy proves validated reads; coverage thresholds unchanged.

### `P03-13b` — Add the circuit-breaker port and in-process adapter
- **Description**: Define `src/modules/shared/ports/circuit-breaker.port.ts` with a narrow `CircuitBreakerPort` (`execute<T>(key, operation): Promise<T>`, `state(key)`) and the `CIRCUIT_BREAKER_PORT` token, then implement `InProcessCircuitBreakerAdapter` in `src/modules/shared/infrastructure/resilience/` as a small CLOSED → OPEN → HALF_OPEN → CLOSED state machine driven by the config from `P03-13a` and the `CLOCK` port from `P02-02`. It is a first-class adapter, not a throwaway stub; P09-02 can replace it behind the same port. This atomic depends on `P03-13a` and supplies the decorator used in `P03-13c`. Atomic checks: (a) narrow port and single token, (b) state machine transitions with injectable clock, (c) no external dependency or business rule.
- **CLI(s)**: `npm run test:unit -- resilience`; `npm run typecheck`.
- **Package(s)**: `None` — an in-process state machine; no new library is introduced so P09 can swap the adapter via token rebind.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/ports/circuit-breaker.port.ts`, `src/modules/shared/ports/circuit-breaker.port.spec.ts`, `src/modules/shared/infrastructure/resilience/in-process-circuit-breaker.adapter.ts`, `src/modules/shared/infrastructure/resilience/in-process-circuit-breaker.adapter.spec.ts`, `src/modules/shared/infrastructure/resilience/resilience.module.ts`
  - **Modified**: `src/app.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/infra-resilience-basic` (shared)
- **Commit**: `feat(infra): add circuit breaker port and in-process adapter`
- **Testing**: `in-process-circuit-breaker.adapter.spec.ts` uses `vi.fn()` fake timers and a `vi.fn()` clock to assert: opens after `failureThreshold` failures, rejects fast while OPEN, allows `halfOpenMaxCalls` in HALF_OPEN, and closes after a success; a `vi.fn()` static scan proves the port imports no framework code; coverage thresholds pass.

### `P03-13c` — Wrap the HTTP client with the breaker and add the conformance spec
- **Description**: Add `src/modules/shared/infrastructure/resilience/resilient-http-client.adapter.ts` that implements `HttpClientPort` by delegating to the `HTTP_CLIENT_PORT` adapter from `P03-10c` through `CIRCUIT_BREAKER_PORT`, keyed by origin; when the circuit is OPEN it throws the domain-safe `HttpError` from `P03-10b` without calling the network. Add `src/modules/shared/infrastructure/resilience/circuit-breaker.conformance.spec.ts` with the `P02-03` harness run against both the in-process adapter and a minimal secondary adapter (e.g. a always-closed pass-through) to prove interchangeability. This atomic depends on `P03-13b` and completes the P03-13 umbrella. Atomic checks: (a) HTTP client decorated without editing the original adapter, (b) breaker conformance spec passes for both adapters, (c) open circuit causes zero outbound calls.
- **CLI(s)**: `npm run test:unit -- resilience`; `npm run test:unit -- http`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/infrastructure/resilience/resilient-http-client.adapter.ts`, `src/modules/shared/infrastructure/resilience/resilient-http-client.adapter.spec.ts`, `src/modules/shared/infrastructure/resilience/circuit-breaker.conformance.spec.ts`, `src/modules/shared/infrastructure/resilience/pass-through-circuit-breaker.adapter.ts`
  - **Modified**: `src/modules/shared/infrastructure/http/http-client.module.ts`, `src/modules/shared/infrastructure/resilience/resilience.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/infra-resilience-basic` (shared)
- **Commit**: `feat(infra): wrap http client with circuit breaker and conformance spec`
- **Testing**: `resilient-http-client.adapter.spec.ts` uses `vi.fn()` on both ports to assert a successful delegate call and a fast-failing `HttpError` when the breaker is OPEN with zero delegate calls; the shared conformance spec runs unchanged against both breaker adapters; coverage thresholds met for all adapters.

## Phase Gate (end of step)

- [x] Full unit tests + coverage thresholds pass.
- [x] E2E proves 429 after the configured limit, idempotent replay, body-change invalidation and TTL expiry; both with in-memory fallbacks.
- [x] HTTP_CLIENT and CIRCUIT_BREAKER ports each have one conformance spec run against every adapter; no sensitive data in mapped errors or logs.
- [x] CACHE port is reused for idempotency (no duplicate store port); no business rules in config; P09-02 can swap the breaker via token rebind.
- [x] Typed config validated; lint/format/typecheck clean; security audit & version sync pass.
- [x] Each atomic commit pushed on its shared branch; PR merged into `dev` in this exact order:
  `P03-10a` → `P03-10b` → `P03-10c` → `P03-10d` → `P03-11a` → `P03-11b` → `P03-11c` → `P03-12a` → `P03-12b` → `P03-12c` → `P03-13a` → `P03-13b` → `P03-13c`.
- [x] Status for umbrella IDs `P03-10`, `P03-11`, `P03-12`, `P03-13` set to `✅ Done` in [`roadmap.md`](../../../roadmap.md) §4 (atomic IDs tracked here).
- [x] Re-check the P03 exit criterion in [`roadmap.md`](../../../roadmap.md) §6.1 before starting the next step.
