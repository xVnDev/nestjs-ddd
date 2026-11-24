# P09 · Step 2 — Observability

**Project:** nestjs-ddd  |  **Phase:** P09 — Hardening & Observability  |  **Base branch:** `dev`  |  **Status:** ⬜ Planned

> Source of truth: [`roadmap.md`](../../../roadmap.md) §4. Umbrella IDs `P09-06`, `P09-07`, `P09-08` stay in the roadmap; this file lists the final atomic split (`P09-06a` … `P09-08f`).
> **Format**: `P<phase>-<umbrella><letter>` — one atomic task = one commit; sibling atomic tasks share one branch (branch per umbrella task). Every atomic task uses the 7-field format: `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing`.
> **Ordering notes**: (a) `P09-06a` creates the typed config and bootstrap file *before* `P09-06b` registers instrumentations; `P09-06c` inserts the single `bootstrapObservability(app)` call in `src/main.ts` so there is one integration point. (b) `P09-07` depends on the OTel SDK from `P09-06` for metric export wiring but serves its own independent `/metrics` endpoint. (c) `P09-08a` defines the `NOTIFIER` port and shared conformance harness first; each of `P09-08b`…`P09-08e` adds one adapter plus its own conformance spec file, and `P09-08f` composes them. (d) Hardening events from `P09-01`…`P09-05` are the metric/alert sources — no earlier step emits these.
> **Correctness invariants**: OTel spans and Prometheus metrics must carry **no PII** and use low-cardinality labels only (`P09-06d`, `P09-07d`); every notifier adapter must pass one conformance spec per adapter (`P09-08b`…`P09-08e`).

## DDD + SOLID lens for this step

- Bounded contexts own `domain/`, `application/`, `infrastructure/`, `interfaces/`; dependencies point inward.
- Domain/application depend only on port tokens; adapters are injected, never imported directly.
- Every port ships one conformance spec run against all adapters, including in-memory fallbacks.
- Business rules live in entities/value objects/use cases; controllers stay thin.
- Introduce a port only when a mechanism must be swappable or isolated for tests.

## Step Summary

Bootstrap the OpenTelemetry SDK with HTTP/database instrumentation, expose a PII-free Prometheus metrics endpoint, and add alerting behind a single notifier port with Telegram, Slack, Discord and email adapters — each proven by its own conformance spec — split into small individually committable atomics.

## Atomic Tasks

### `P09-06a` — Add typed observability config and install the OTel SDK
- **Description**: Install the OpenTelemetry SDK/API packages and add a typed `observability` config slice (service name, enabled flag, exporter type, sample rate, OTLP endpoint when applicable) exported as `as Provider()` and validated by Joi. Create the empty `bootstrapObservability()` file that will be filled by later atomics, so configuration and integration point exist before instrumentation. Atomic checks: (a) exact SDK packages in `package.json`, (b) Joi rejects a missing service name / invalid sample rate, (c) bootstrap file is present but does not yet register instruments.
- **CLI(s)**: `npm install @opentelemetry/sdk-node @opentelemetry/api @opentelemetry/resources @opentelemetry/semantic-conventions`; `npm run test:unit -- observability-config`; `npm run typecheck`.
- **Package(s)**: installed with `npm install @opentelemetry/sdk-node @opentelemetry/api @opentelemetry/resources @opentelemetry/semantic-conventions` (plus `@opentelemetry/sdk-trace-base` if required by the installed SDK version).
- **File(s)/Folder(s)**:
  - **Added**: `src/common/config/observability.config.ts`, `src/common/config/observability.config.spec.ts`, `src/common/observability/bootstrap-observability.ts`
  - **Modified**: `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `feat/otel-bootstrap` (shared with `P09-06b`, `P09-06c`, `P09-06d`)
- **Commit**: `feat(observability): add typed observability config and otel sdk`
- **Testing**: Config spec asserts valid config loads, invalid sample rate / empty service name throw via Joi, and that no endpoint value is a real secret; `vi.fn()` for any config-loader mock; coverage thresholds pass.

### `P09-06b` — Register HTTP and database instrumentation with an in-memory exporter
- **Description**: Extend `bootstrapObservability()` to build a `NodeSDK` resource with `service.name` from config and register instrumentation for inbound/outbound HTTP and TypeORM/Postgres queries; attach an in-memory `InMemorySpanExporter` for tests and an OTLP exporter only when `exporterType === 'otlp'`. Ensure the exporter/exporter choice never logs credentials. Atomic checks: (a) NodeSDK configured with service resource, (b) HTTP + DB instrumentations registered, (c) in-memory exporter used in test env and asserted by the integration spec.
- **CLI(s)**: `npm install @opentelemetry/instrumentation-http @opentelemetry/instrumentation-pg @opentelemetry/sdk-trace-base`; `npm run test:unit -- otel-instrumentation`.
- **Package(s)**: installed with the three `@opentelemetry/*` instrumentation/export packages above (test-only in-memory exporter stays in devDependencies).
- **File(s)/Folder(s)**:
  - **Added**: `src/common/observability/otel-instrumentation.ts`, `src/common/observability/otel-instrumentation.spec.ts`
  - **Modified**: `src/common/observability/bootstrap-observability.ts`, `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `feat/otel-bootstrap` (shared)
- **Commit**: `feat(observability): register http and db instrumentation with in-memory exporter`
- **Testing**: Unit spec uses `vi.fn()` on `NodeSDK.start()`/exporter to assert instrumentations and resource attributes are registered; asserts no endpoint/credential appears in span attributes; coverage thresholds pass.

### `P09-06c` — Wire bootstrap into main.ts with graceful-shutdown flush
- **Description**: Call `bootstrapObservability()` once in `src/main.ts` at the earliest point before the app starts listening, and hook its `shutdown()`/force-flush into the existing `enableShutdownHooks()` from `P01-07` so spans are exported on SIGTERM. Guard the call with the typed `enabled` flag (no-op in tests unless opted in). Atomic checks: (a) single call site in `main.ts`, (b) shutdown flushes the exporter, (c) disabled mode is a true no-op.
- **CLI(s)**: `npm run test:e2e -- observability-bootstrap`; `npm run typecheck`.
- **Package(s)**: `None` — reuses OTel packages from `P09-06a`/`P09-06b`.
- **File(s)/Folder(s)**:
  - **Added**: `test/observability-bootstrap.e2e-spec.ts`
  - **Modified**: `src/main.ts`, `src/common/observability/bootstrap-observability.ts`
  - **Deleted**: `None`
- **Branch**: `feat/otel-bootstrap` (shared)
- **Commit**: `feat(observability): wire otel bootstrap and shutdown flush into main`
- **Testing**: E2E asserts bootstrap is invoked once and that shutdown calls the exporter flush via `vi.fn()` spy; disabled-mode spec asserts no SDK start; coverage thresholds pass.

### `P09-06d` — Assert emitted spans for HTTP/DB and absence of PII
- **Description**: Add an integration spec that boots the app with the in-memory exporter, issues a real HTTP request that performs a DB query, and asserts spans exist for both the HTTP server and the Postgres query with correct names and `service.name`. Add an explicit sweep asserting span attributes/labels never contain request body fields, tokens, emails or passwords (only route templates and low-cardinality attributes). Atomic checks: (a) HTTP + DB spans present, (b) resource attribute `service.name` set, (c) PII sweep finds no sensitive values.
- **CLI(s)**: `npm run test:integration -- otel-spans`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `test/otel-spans.integration-spec.ts`
  - **Modified**: `src/common/observability/otel-instrumentation.spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/otel-bootstrap` (shared)
- **Commit**: `test(observability): assert http/db spans and no pii in attributes`
- **Testing**: Integration spec reads `InMemorySpanExporter.getFinishedSpans()` and asserts names/attributes, with faker PII sent in the request and asserted absent from all spans; coverage thresholds pass.

### `P09-07a` — Add the Prometheus client and metrics module
- **Description**: Install `prom-client` (or the NestJS Prometheus wrapper) and create a `MetricsModule` that owns a single `Registry`, plus a typed `metrics` config slice (enabled flag, path, auth token env name) validated by Joi. Keep the registry injectable behind a token so use cases/adapters record metrics without importing `prom-client` directly. Atomic checks: (a) exact packages installed, (b) one registry per app, (c) config validates path/auth env name.
- **CLI(s)**: `npm install prom-client @willsoto/nestjs-prometheus`; `npm run test:unit -- metrics-module`; `npm run typecheck`.
- **Package(s)**: installed with `npm install prom-client @willsoto/nestjs-prometheus`; `@opentelemetry/api` reused from `P09-06`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/config/metrics.config.ts`, `src/common/config/metrics.config.spec.ts`, `src/common/metrics/metrics.module.ts`, `src/common/metrics/metrics-registry.provider.ts`
  - **Modified**: `src/app.module.ts`, `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `feat/otel-prometheus-metrics` (shared with `P09-07b`, `P09-07c`, `P09-07d`)
- **Commit**: `feat(observability): add prometheus client and metrics module`
- **Testing**: Module spec asserts a single injectable registry and config Joi validation; `vi.fn()` on registry methods; coverage thresholds pass.

### `P09-07b` — Expose a guarded /metrics endpoint
- **Description**: Mount a controlled `GET /metrics` endpoint that returns `registry.metrics()` with `Content-Type: text/plain; version=0.0.4`. Protect it using a typed auth token from config (header-based, hashed comparison) so it is not publicly scrapeable, and return 404/403 when disabled or unauthenticated. Atomic checks: (a) correct content type/body, (b) unauthorized request rejected, (c) disabled mode returns 404 — not an empty 200.
- **CLI(s)**: `npm run test:e2e -- metrics-endpoint`; `npm run typecheck`.
- **Package(s)**: `None` — reuses packages from `P09-07a`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/metrics/metrics.controller.ts`, `src/common/metrics/metrics.controller.spec.ts`, `test/metrics-endpoint.e2e-spec.ts`
  - **Modified**: `src/common/metrics/metrics.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/otel-prometheus-metrics` (shared)
- **Commit**: `feat(observability): expose guarded prometheus metrics endpoint`
- **Testing**: E2E asserts 200 with auth token, 403 without, 404 when disabled, and correct content type; `vi.fn()` for token comparison; coverage thresholds pass.

### `P09-07c` — Instrument hardening events as counters and histograms
- **Description**: Define a small set of low-cardinality metrics: HTTP request duration histogram (label: method, route template, status class only), rate-limit rejection counter, circuit-breaker state-transition counter, key-rotation operation counter, and field-encryption operation counter. Register them in the registry and call them from the hardened components via the registry token (no direct import in domain/application). Add unit specs asserting each collector increments on the corresponding event. Atomic checks: (a) each metric has a bounded label set, (b) no user/account/IP label, (c) increments asserted with `vi.fn()`.
- **CLI(s)**: `npm run test:unit -- metrics-collectors`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/metrics/metric-names.ts`, `src/common/metrics/metrics.service.ts`, `src/common/metrics/metrics.service.spec.ts`
  - **Modified**: `src/common/middleware/rate-limit.guard.ts`, `src/modules/shared/adapters/resilience-executor.adapter.ts`, `src/common/crypto/aes-gcm-encryption.service.ts`
  - **Deleted**: `None`
- **Branch**: `feat/otel-prometheus-metrics` (shared)
- **Commit**: `feat(observability): instrument hardening events as prometheus metrics`
- **Testing**: `metrics.service.spec.ts` asserts each counter/histogram records with only allowed labels using `vi.fn()` spies on registry methods; coverage thresholds pass.

### `P09-07d` — Add E2E metrics spec and PII/label-cardinality guard
- **Description**: Add an E2E suite that exercises a few requests (including a rate-limit rejection and a breaker transition) then scrapes `/metrics`, asserting the expected metric families are present and correctly typed. Add a guard test that scans all emitted label names/values against a deny-list (email, token, password, raw IP, user id) and asserts label values come from a bounded set (route templates, not concrete paths). Atomic checks: (a) expected families present, (b) PII deny-list scan passes, (c) label cardinality bounded.
- **CLI(s)**: `npm run test:e2e -- metrics`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `test/metrics.e2e-spec.ts`
  - **Modified**: `src/common/metrics/metrics.service.spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/otel-prometheus-metrics` (shared)
- **Commit**: `test(observability): assert metric families and no pii labels`
- **Testing**: E2E asserts family names/types and absence of faker PII injected into requests; label-cardinality spec asserts route templates only; coverage thresholds pass.

### `P09-08a` — Define the notifier port, message value object and conformance harness
- **Description**: In the `alerts` bounded context define a narrow `Notifier` port (`send(AlertMessage): Promise<SendResult>`) with a DI token, an `AlertMessage` value object (severity, title, body, optional target) and a `SendResult` type. Create the shared conformance harness function that every adapter spec will import and run unchanged; include an in-memory notifier as the first conforming fallback adapter. Atomic checks: (a) port is interface + token only, (b) harness exported and adapter-agnostic, (c) in-memory adapter present and passes harness.
- **CLI(s)**: `npm run test:unit -- notifier-port`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/alerts/domain/notifier.port.ts`, `src/modules/alerts/domain/alert-message.ts`, `src/modules/alerts/adapters/notifier-memory.adapter.ts`, `src/modules/alerts/adapters/notifier.conformance-harness.ts`
  - **Modified**: `None`, `src/modules/alerts/alerts.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/observability-alerts` (shared with `P09-08b`, `P09-08c`, `P09-08d`, `P09-08e`, `P09-08f`)
- **Commit**: `feat(observability): define notifier port, message and conformance harness`
- **Testing**: `notifier.conformance-harness.ts` asserts send success/failure and message invariants; memory adapter spec runs the harness; all network calls in adapter specs are `vi.fn()`; coverage thresholds pass.

### `P09-08b` — Add the Telegram notifier adapter with its conformance spec
- **Description**: Implement a Telegram notifier that posts `AlertMessage` to a bot API endpoint configured via typed config/env (token read from env, never committed). Escape message text, handle non-2xx responses and timeouts, and return a normalised `SendResult`. Add a dedicated conformance spec file that runs the shared harness against this adapter plus `vi.fn()` tests for the HTTP payload. Atomic checks: (a) one conformance spec file for this adapter, (b) token sourced from env/Joi only, (c) no token in logs/errors.
- **CLI(s)**: `npm run test:unit -- notifier-telegram`; `npm run typecheck`.
- **Package(s)**: `None` — reuses the first-party HTTP client from `P03-10`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/alerts/adapters/notifier-telegram.adapter.ts`, `src/modules/alerts/adapters/notifier-telegram.adapter.spec.ts`, `src/common/config/telegram.config.ts`
  - **Modified**: `src/modules/alerts/alerts.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/observability-alerts` (shared)
- **Commit**: `feat(observability): add telegram notifier adapter with conformance spec`
- **Testing**: `notifier-telegram.adapter.spec.ts` runs the shared conformance harness unchanged and asserts payload escaping/failure mapping with `vi.fn()` HTTP mocks; coverage thresholds pass.

### `P09-08c` — Add the Slack notifier adapter with its conformance spec
- **Description**: Implement a Slack notifier using an incoming webhook URL from typed config/env (no hard-coded webhook), mapping severity to Slack attachment colours and truncating over-long bodies. Return normalised `SendResult` on success and on rate-limit/error responses. Add a dedicated conformance spec file running the shared harness against this adapter. Atomic checks: (a) dedicated conformance spec present, (b) webhook from env only, (c) payload truncation asserted.
- **CLI(s)**: `npm run test:unit -- notifier-slack`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/alerts/adapters/notifier-slack.adapter.ts`, `src/modules/alerts/adapters/notifier-slack.adapter.spec.ts`, `src/common/config/slack.config.ts`
  - **Modified**: `src/modules/alerts/alerts.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/observability-alerts` (shared)
- **Commit**: `feat(observability): add slack notifier adapter with conformance spec`
- **Testing**: `notifier-slack.adapter.spec.ts` runs the shared conformance harness and asserts colour mapping/truncation/HTTP failure handling with `vi.fn()` mocks; coverage thresholds pass.

### `P09-08d` — Add the Discord notifier adapter with its conformance spec
- **Description**: Implement a Discord notifier using a webhook URL from typed config/env, posting an embed with severity/title/body and honouring Discord's message-length limits. Normalise success and failure responses into `SendResult`. Add a dedicated conformance spec file running the shared harness against this adapter. Atomic checks: (a) dedicated conformance spec present, (b) webhook from env only, (c) no PII in alert payloads from fixtures.
- **CLI(s)**: `npm run test:unit -- notifier-discord`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/alerts/adapters/notifier-discord.adapter.ts`, `src/modules/alerts/adapters/notifier-discord.adapter.spec.ts`, `src/common/config/discord.config.ts`
  - **Modified**: `src/modules/alerts/alerts.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/observability-alerts` (shared)
- **Commit**: `feat(observability): add discord notifier adapter with conformance spec`
- **Testing**: `notifier-discord.adapter.spec.ts` runs the shared conformance harness and asserts embed payload/length handling with `vi.fn()` HTTP mocks, plus a PII sweep; coverage thresholds pass.

### `P09-08e` — Add the operator-email notifier adapter with its conformance spec
- **Description**: Implement an email notifier that reuses the mail port and queue producer from `P03-07` (never sends synchronously in the request path), renders a plain-text alert from `AlertMessage` via the i18n templates from `P03-08`, and maps queue enqueue results to `SendResult`. Add a dedicated conformance spec file running the shared harness against this adapter. Atomic checks: (a) dedicated conformance spec present, (b) uses mail port token only, (c) alert templates contain no PII placeholders from user data.
- **CLI(s)**: `npm run test:unit -- notifier-email`; `npm run typecheck`.
- **Package(s)**: `None` — reuses mail port/templates from `P03-07`/`P03-08`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/alerts/adapters/notifier-email.adapter.ts`, `src/modules/alerts/adapters/notifier-email.adapter.spec.ts`, `src/modules/alerts/interfaces/templates/alert-email.hbs`
  - **Modified**: `src/modules/alerts/alerts.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/observability-alerts` (shared)
- **Commit**: `feat(observability): add operator-email notifier adapter with conformance spec`
- **Testing**: `notifier-email.adapter.spec.ts` runs the shared harness and asserts enqueue via `vi.fn()` mail-port mock and rendered template content; coverage thresholds pass.

### `P09-08f` — Add the alert router and end-to-end notification coverage
- **Description**: Add an `AlertRouter` that maps event types/severities to configured notifier channels via the `NOTIFIER` token, deduplicates repeats within a window, and falls back to the memory/in-memory notifier when a configured adapter fails (no thrown errors into request flow). Add an E2E suite that triggers a hardening event (e.g. a breaker trip or lockout) and asserts the expected channel receives one alert with no PII. Atomic checks: (a) channel selection from typed config, (b) failure falls back without throwing, (c) alert content contains no faker PII.
- **CLI(s)**: `npm run test:e2e -- alerts`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/alerts/application/alert-router.ts`, `src/modules/alerts/application/alert-router.spec.ts`, `test/alerts.e2e-spec.ts`, `src/common/config/alerts.config.ts`
  - **Modified**: `src/modules/alerts/alerts.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/observability-alerts` (shared)
- **Commit**: `feat(observability): add alert router with fallback and E2E coverage`
- **Testing**: Router unit spec uses `vi.fn()` notifier mocks to assert routing/dedup/fallback; E2E asserts one alert delivered to the expected adapter and no PII in payloads; coverage thresholds pass.

## Phase Gate (end of step)

- [ ] Full unit tests + coverage thresholds pass.
- [ ] OTel integration spec emits HTTP + DB spans with `service.name`; Prometheus E2E asserts expected metric families.
- [ ] PII/deploy-cardinality sweeps pass for spans, metrics and alert payloads (no emails, tokens, passwords, user ids or raw IPs).
- [ ] One conformance spec per notifier adapter passes unchanged for memory, Telegram, Slack, Discord and email adapters.
- [ ] Typed config validated; no secrets/webhook URLs/tokens committed; lint/format/typecheck clean.
- [ ] Security audit & version sync pass.
- [ ] Each atomic commit pushed on its shared branch; PRs merged into `dev` in this exact order:
  `P09-06a` → `P09-06b` → `P09-06c` → `P09-06d` → `P09-07a` → `P09-07b` → `P09-07c` → `P09-07d` → `P09-08a` → `P09-08b` → `P09-08c` → `P09-08d` → `P09-08e` → `P09-08f`.
- [ ] Status for umbrella IDs `P09-06`, `P09-07`, `P09-08` set to `✅ Done` in [`roadmap.md`](../../../roadmap.md) §4 (atomic IDs tracked here).
- [ ] Re-check the P09 exit criterion in [`roadmap.md`](../../../roadmap.md) §6.1 before starting the next step.
