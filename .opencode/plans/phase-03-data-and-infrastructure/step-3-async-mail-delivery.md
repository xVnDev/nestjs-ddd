# P03 · Step 3 — Async Mail Delivery

**Project:** nestjs-ddd  |  **Phase:** P03 — Data & Infrastructure  |  **Base branch:** `dev`  |  **Status:** ✅ Done

> Source of truth: [`roadmap.md`](../../../roadmap.md) §4. Umbrella IDs `P03-07`, `P03-08`, `P03-09` stay in the roadmap; this file lists the final atomic split (`P03-07a` … `P03-09e`).
> **Format**: `P<phase>-<umbrella><letter>` — one atomic task = one commit; sibling atomic tasks share one branch (branch per umbrella). Every atomic task uses the 7-field format: `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing`.
> **Ordering notes**: (a) `P03-07a` (config) → `P03-07b` (MAIL port/message type) → `P03-07c` (SMTP transport + conformance) → `P03-07d` (in-memory transport runs same spec) → `P03-07e` (named queue producer) → `P03-07f` (worker calls MAIL port + E2E). The producer/worker build on the QUEUE port from `P03-06b`. (b) `P03-08a` (i18n module) → `P03-08b` (Handlebars templates per locale) → `P03-08c` (render service behind a narrow port) → `P03-08d` (worker renders before sending). (c) `P03-09a` (status lifecycle type) → `P03-09b`/`P03-09c` (memory + TypeORM status stores with conformance) → `P03-09d` (producer/worker emit transitions) → `P03-09e` (queue abandonment hooks); send status is a lifecycle, never a business rule in config.

## DDD + SOLID lens for this step

- Bounded contexts own `domain/`, `application/`, `infrastructure/`, `interfaces/`; dependencies point inward.
- Domain/application depend only on port tokens; adapters are injected, never imported directly.
- Every port ships one conformance spec run against all adapters, including in-memory fallbacks.
- Business rules live in entities/value objects/use cases; controllers stay thin.
- Introduce a port only when a mechanism must be swappable or isolated for tests.

## Step Summary

Define a narrow MAIL port with SMTP and in-memory transport adapters proven by one conformance spec, enqueue sends through a named queue producer/worker pair built on the QUEUE port, render localised Handlebars templates through `nestjs-i18n`, and track a `QUEUED → PROCESSING → SENT | FAILED | ABANDONED` send-status lifecycle with queue abandonment hooks.

## Atomic Tasks

### `P03-07a` — Add the typed, validated mail config slice
- **Description**: Create `src/common/config/mail.config.ts` using `registerAs('mail', ...)` with `from` address, `provider: 'smtp' | 'memory'`, `smtpUrl`/`smtpHost`/`smtpPort`, `queueName: 'mail'`, `defaultLocale` and optional credentials read from validated env only, exported as a typed `as Provider()` value for `MailerModule.forRootAsync()`. Extend the Joi schema from `P01-04` with `MAIL_FROM`, `MAIL_SMTP_URL` and `MAIL_DEFAULT_LOCALE`, failing fast on invalid input and never logging secrets. Config is pure data: no template choice, retry rule or status transition belongs here — those are `P03-07e`…`P03-09e`; this atomic must land first. Atomic checks: (a) typed `registerAs('mail')` namespace, (b) Joi rejects a bad `MAIL_FROM`, (c) no secret value appears in the object's serialised form used by logs.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `@nestjs/config` and `joi` from `P01-04`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/config/mail.config.ts`, `src/common/config/mail.config.spec.ts`
  - **Modified**: `src/common/config/env.validation.ts`, `src/common/config/config.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/mail-port-queue-worker` (shared with `P03-07b` … `P03-07f`)
- **Commit**: `feat(mail): add typed mail config slice with joi validation`
- **Testing**: `mail.config.spec.ts` asserts the typed fields, `queueName === 'mail'` and injection via `as Provider()`; a `vi.fn()` env spy checks validated reads; a redaction assertion ensures credentials never appear in `JSON.stringify(config)`; coverage thresholds unchanged.

### `P03-07b` — Define the MAIL port, message type and DI token
- **Description**: Add `src/modules/shared/ports/mail.port.ts` with the narrow `MailPort` (`send(message: MailMessage): Promise<void>`) and the `MAIL_PORT` token reserved in `P02-02`; define `MailMessage` (to, subject, template key, locale, context) in `src/modules/mail/domain/mail-message.ts` so the transport receives already-rendered content and holds no template or locale logic. The port is transport-agnostic and imports no nodemailer/SMTP type, allowing `vi.fn()` mocks in producer/worker tests. This atomic gates all transport and conformance work in `P03-07c`…`P03-07f`. Atomic checks: (a) one token, one narrow method, (b) zero infrastructure imports in the port, (c) `MailMessage` carries only data.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/ports/mail.port.spec.ts`, `src/modules/mail/domain/mail-message.ts`, `src/modules/mail/domain/mail-message.spec.ts`
  - **Modified**: `None`, `src/modules/shared/ports/mail.port.ts`
  - **Deleted**: `None`
- **Branch**: `feat/mail-port-queue-worker` (shared)
- **Commit**: `feat(mail): define mail port, message type and di token`
- **Testing**: `mail.port.spec.ts` type-checks a dummy `MailPort` implementation and asserts a unique token; `mail-message.spec.ts` uses a `vi.fn()` static scan to prove the domain type imports no framework code; coverage thresholds pass.

### `P03-07c` — Implement the SMTP transport adapter and mail conformance spec
- **Description**: Add `src/modules/mail/adapters/smtp-mail.adapter.ts` implementing `MailPort` via `@nestjs-modules/mailer`/Nodemailer, wired with `MailerModule.forRootAsync()` using the typed provider from `P03-07a` and bound to `MAIL_PORT`. In the same atomic add `src/modules/mail/adapters/mail.conformance.spec.ts` with the `P02-03` harness, parameterised over a `MailPort` factory, asserting envelope fields (to/from/subject/body), locale passthrough and error propagation; run it against the SMTP adapter with a `vi.fn()` Nodemailer transport. This atomic depends on `P03-07b` and fixes the contract `P03-07d` must satisfy unchanged. Atomic checks: (a) adapter injected by token, (b) spec asserts all envelope fields, (c) transport failures reject rather than silently succeed.
- **CLI(s)**: `npm install @nestjs-modules/mailer nodemailer handlebars`; `npm install -D @types/nodemailer`; `npm run test:unit -- mail`; `npm run typecheck`.
- **Package(s)**: installed with `npm install @nestjs-modules/mailer nodemailer handlebars` (Nest mail module, SMTP transport and template engine) and `npm install -D @types/nodemailer` (transport types).
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/mail/adapters/smtp-mail.adapter.ts`, `src/modules/mail/adapters/smtp-mail.adapter.spec.ts`, `src/modules/mail/adapters/mail.conformance.spec.ts`
  - **Modified**: `src/app.module.ts`, `package.json`, `package-lock.json`, `src/modules/mail/mail.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/mail-port-queue-worker` (shared)
- **Commit**: `feat(mail): add smtp transport adapter and mail conformance spec`
- **Testing**: `smtp-mail.adapter.spec.ts` asserts the sendmail call payload with a `vi.fn()` transport mock; the shared conformance spec asserts to/from/subject/rendered-body, locale and rejected errors; coverage threshold ≥90% lines/branches on adapter code; `P03-07d` must import the spec verbatim.

### `P03-07d` — Add the in-memory mail transport and conform it
- **Description**: Add `src/modules/mail/adapters/in-memory-mail.adapter.ts` implementing `MailPort` by appending each `MailMessage` to an inspectable, deep-copied in-memory outbox with a `vi.fn()`-spyable `sent()` accessor; it is the default when `provider: 'memory'`, so local dev and E2E send no real email. Import the `P03-07c` conformance suite unchanged with this adapter's factory and add an equivalence assertion that both adapters satisfy the identical contract. This atomic depends on `P03-07c` and completes the MAIL transport port's adapter coverage. Atomic checks: (a) same spec file, zero edits, (b) both adapters green, (c) no network call in memory mode.
- **CLI(s)**: `npm run test:unit -- mail`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/mail/adapters/in-memory-mail.adapter.ts`, `src/modules/mail/adapters/in-memory-mail.adapter.spec.ts`, `src/modules/mail/adapters/mail-equivalence.spec.ts`
  - **Modified**: `src/modules/mail/mail.module.ts`, `src/modules/mail/adapters/mail.conformance.spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/mail-port-queue-worker` (shared)
- **Commit**: `feat(mail): add in-memory transport and conform mail port`
- **Testing**: The shared conformance spec runs unchanged for SMTP (mocked) and in-memory factories; `in-memory-mail.adapter.spec.ts` asserts deep copies and order via `vi.fn()`; `mail-equivalence.spec.ts` compares observable results; coverage thresholds met for both adapters.

### `P03-07e` — Add the named mail queue producer
- **Description**: Add `src/modules/mail/application/mail-queue.producer.ts` that injects `QUEUE_PORT` from `P03-06b` and enqueues a `SendMailJob` to the named queue `mail` from `P03-07a`, carrying only serialisable data (message DTO + job id for status tracking in `P03-09d`). Expose a thin `enqueueMail()` method used by future use cases; it decides no business rules and does not touch the MAIL port directly. This atomic depends on `P03-07a`/`P03-07b` and provides the job shape the worker in `P03-07f` consumes. Atomic checks: (a) job enqueued to queue name `mail`, (b) payload serialisable with a job id, (c) producer injects only the QUEUE port.
- **CLI(s)**: `npm run test:unit -- mail`; `npm run typecheck`.
- **Package(s)**: `None` — reuses the QUEUE port from `P03-06b`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/mail/application/mail-queue.producer.ts`, `src/modules/mail/application/mail-queue.producer.spec.ts`
  - **Modified**: `src/modules/mail/mail.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/mail-port-queue-worker` (shared)
- **Commit**: `feat(mail): add named mail queue producer`
- **Testing**: `mail-queue.producer.spec.ts` mocks `QueuePort.enqueue` with `vi.fn()` and asserts queue name `mail`, payload shape and job id presence; a faker fixture from `P01-03` supplies the message; coverage thresholds unchanged.

### `P03-07f` — Add the mail queue worker and E2E enqueue→worker→transport
- **Description**: Add `src/modules/mail/application/mail-queue.worker.ts` that registers a worker via `QUEUE_PORT` on the `mail` queue and, for each job, calls `MAIL_PORT.send()` with the job's message; keep rendering and status writes to `P03-08d`/`P03-09d` so this atomic stays a single responsibility. Wire registration into `MailModule` lifecycle hooks and add an E2E that boots with both in-memory adapters (queue + transport) and asserts the outbox receives exactly one deep-equal message from a seeded faker fixture. This atomic depends on `P03-07c`/`P03-07e` and proves the async path with zero external services. Atomic checks: (a) worker registered on queue `mail`, (b) transport receives one message, (c) no SMTP/Redis process required.
- **CLI(s)**: `npm run test:unit -- mail`; `npm run test:e2e -- mail`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/mail/application/mail-queue.worker.ts`, `src/modules/mail/application/mail-queue.worker.spec.ts`, `test/mail-async.e2e-spec.ts`
  - **Modified**: `src/modules/mail/mail.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/mail-port-queue-worker` (shared)
- **Commit**: `feat(mail): add mail queue worker and async delivery e2e`
- **Testing**: `mail-queue.worker.spec.ts` uses `vi.fn()` on `MailPort.send` and `QueuePort.registerWorker` to assert one call with the job payload; `test/mail-async.e2e-spec.ts` asserts the in-memory outbox content and count; coverage thresholds pass.

### `P03-08a` — Wire nestjs-i18n with typed config
- **Description**: Install `nestjs-i18n` and add `src/common/config/i18n.config.ts` using `registerAs('i18n', ...)` for `defaultLocale`, `supportedLocales` and `translationsPath`, exported as a typed `as Provider()` value. Register `I18nModule.forRootAsync()` in `MailModule` using that provider with JSON translations and a path resolver, keeping locale data out of templates and transports. This atomic depends on `P03-07a` (locale default) and gates the templates and render service in `P03-08b`/`P03-08c`. Atomic checks: (a) typed i18n config provider, (b) `I18nModule` async-registered, (c) supported locales validated against config.
- **CLI(s)**: `npm install nestjs-i18n`; `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: installed with `npm install nestjs-i18n` (localisation module); reuses `handlebars` from `P03-07c`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/config/i18n.config.ts`, `src/common/config/i18n.config.spec.ts`, `src/modules/mail/i18n/i18n.module.ts`
  - **Modified**: `src/common/config/config.module.ts`, `src/modules/mail/mail.module.ts`, `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `feat/mail-i18n-handlebars` (shared with `P03-08b` … `P03-08d`)
- **Commit**: `feat(mail): wire nestjs-i18n with typed locale config`
- **Testing**: `i18n.config.spec.ts` asserts typed values and `as Provider()` injection; a `vi.fn()` spy on `I18nModule.forRootAsync` asserts it receives the config token; a locale-resolution unit spec asserts `en`/a second locale resolve; coverage thresholds unchanged.

### `P03-08b` — Add localised Handlebars templates
- **Description**: Add Handlebars template files under `src/modules/mail/adapters/templates/<locale>/` (e.g. `welcome.hbs`, `verify-email.hbs`, `forgot-password.hbs`) plus a locale JSON catalogue holding subject strings and shared labels, so subject and body are localised without conditionals in code. Templates interpolate only context variables supplied by the render service in `P03-08c` and contain no real credentials, PII or hard-coded business rules. This atomic depends on `P03-08a` and supplies the files the renderer resolves. Atomic checks: (a) at least two locales present with the same template keys, (b) subject strings come from locale JSON, (c) no secrets in templates.
- **CLI(s)**: `mkdir -p src/modules/mail/adapters/templates/en src/modules/mail/adapters/templates/<second-locale>`; `npm run test:unit -- mail`.
- **Package(s)**: `None` — reuses `handlebars` and `nestjs-i18n` from `P03-07c`/`P03-08a`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/mail/adapters/templates/en/welcome.hbs`, `src/modules/mail/adapters/templates/en/verify-email.hbs`, `src/modules/mail/adapters/templates/en/forgot-password.hbs`, `src/modules/mail/adapters/templates/<second-locale>/*.hbs`, `src/modules/mail/i18n/en/mail.json`, `src/modules/mail/i18n/<second-locale>/mail.json`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/mail-i18n-handlebars` (shared)
- **Commit**: `feat(mail): add localised handlebars mail templates`
- **Testing**: A template-parity spec asserts every locale has the same set of `.hbs` files and JSON keys; a rendered-snapshot spec with a `vi.fn()` context asserts no unresolved `{{...}}` placeholders and no PII/secrets in defaults; coverage thresholds pass.

### `P03-08c` — Add the template render service behind a narrow port
- **Description**: Define a context-local `TemplateRenderer` port in `src/modules/mail/domain/ports/` (`render(key, locale, context): { subject, body }`) and implement `MailTemplateRenderService` in `src/modules/mail/application/` using Handlebars plus `I18nService.translate()` for the per-locale subject. Keep the service free of transport concerns so it can be unit-tested with `vi.fn()` mocks on both the i18n service and the file loader; the port keeps the worker dependant on an abstraction. This atomic depends on `P03-08b` and is consumed by `P03-08d`. Atomic checks: (a) narrow port in mail domain, (b) locale-specific subject resolution, (c) no SMTP or queue import in the renderer.
- **CLI(s)**: `npm run test:unit -- mail`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/mail/domain/ports/template-renderer.port.ts`, `src/modules/mail/application/mail-template-render.service.ts`, `src/modules/mail/application/mail-template-render.service.spec.ts`
  - **Modified**: `src/modules/mail/mail.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/mail-i18n-handlebars` (shared)
- **Commit**: `feat(mail): add handlebars template render service`
- **Testing**: `mail-template-render.service.spec.ts` uses `vi.fn()` on `I18nService.translate` per locale and asserts correct subject and fully interpolated body for each template key; an unknown-locale case falls back to `defaultLocale`; coverage thresholds met.

### `P03-08d` — Render in the worker and E2E the localised body
- **Description**: Extend the `P03-07f` worker to resolve the job's locale, call `TemplateRenderer.render()` from `P03-08c`, and pass the rendered subject/body to `MAIL_PORT.send()`; the job carries the template key and context, never pre-rendered HTML. Add an E2E that enqueues the same job in two locales with in-memory adapters and asserts the outbox contains correctly localised subjects/bodies. This atomic depends on `P03-08c` and keeps rendering out of the transport and producer. Atomic checks: (a) worker injects renderer + MAIL ports only, (b) two locales produce two different subjects, (c) no unresolved placeholders in delivered bodies.
- **CLI(s)**: `npm run test:e2e -- mail`; `npm run test:unit -- mail`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `test/mail-i18n.e2e-spec.ts`
  - **Modified**: `src/modules/mail/application/mail-queue.worker.ts`, `src/modules/mail/application/mail-queue.worker.spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/mail-i18n-handlebars` (shared)
- **Commit**: `feat(mail): render localised templates in mail worker`
- **Testing**: `test/mail-i18n.e2e-spec.ts` asserts distinct localised subjects/bodies in the in-memory outbox; `mail-queue.worker.spec.ts` uses `vi.fn()` on `TemplateRenderer.render` and `MailPort.send` to assert one render→send sequence per job; coverage thresholds pass.

### `P03-09a` — Define the mail send-status lifecycle type
- **Description**: Add `src/modules/mail/domain/mail-send-status.ts` with the `MailSendStatus` enum (`QUEUED`, `PROCESSING`, `SENT`, `FAILED`, `ABANDONED`) and a pure `canTransition(from, to)` guard plus a documented terminal-state rule, so lifecycle rules live in the domain and not in config or adapters. This atomic gates the status stores and producer/worker instrumentation in `P03-09b`…`P03-09e`. Atomic checks: (a) all five states present, (b) `canTransition` rejects illegal jumps, (c) domain file has zero framework imports.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/mail/domain/mail-send-status.ts`, `src/modules/mail/domain/mail-send-status.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/mail-send-status` (shared with `P03-09b` … `P03-09e`)
- **Commit**: `feat(mail): add mail send-status lifecycle type`
- **Testing**: `mail-send-status.spec.ts` is a pure transition-table test asserting every legal edge and rejecting e.g. `SENT → PROCESSING` and transitions out of `ABANDONED`; a `vi.fn()` static scan proves no infrastructure import; coverage thresholds unchanged.

### `P03-09b` — Add the status-store port and in-memory adapter
- **Description**: Define a narrow context-local `MailStatusStore` port in `src/modules/mail/domain/ports/` (`set(jobId, status)`, `get(jobId)`, `listByStatus(status)`) and implement `InMemoryMailStatusStoreAdapter` in `src/modules/mail/infrastructure/` with deep-copied records and the same `vi.fn()`-spyable inspection pattern as the in-memory mail outbox. Bind it to a `MAIL_STATUS_STORE` token in `MailModule` as the default for local/E2E use. This atomic depends on `P03-09a` and provides the first adapter for the conformance suite; `P03-09c` adds the TypeORM adapter. Atomic checks: (a) narrow port and single token, (b) in-memory adapter injectable, (c) statuses typed by `MailSendStatus`.
- **CLI(s)**: `npm run test:unit -- mail`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/mail/domain/ports/mail-status-store.port.ts`, `src/modules/mail/infrastructure/in-memory-mail-status-store.adapter.ts`, `src/modules/mail/infrastructure/in-memory-mail-status-store.adapter.spec.ts`
  - **Modified**: `src/modules/mail/mail.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/mail-send-status` (shared)
- **Commit**: `feat(mail): add mail status store port and memory adapter`
- **Testing**: `in-memory-mail-status-store.adapter.spec.ts` asserts set/get/list behaviour and deep-copy isolation with `vi.fn()` spies; coverage thresholds unchanged.

### `P03-09c` — Add the TypeORM status-store adapter and shared conformance spec
- **Description**: Add `TypeOrmMailStatusStoreAdapter` in `src/modules/mail/infrastructure/` persisting `jobId → status` with timestamps in a dedicated `mail_send_status` entity, and add `src/modules/mail/infrastructure/mail-status-store.conformance.spec.ts` using the `P02-03` harness over a `MailStatusStore` factory. Run that unchanged spec against both the in-memory adapter from `P03-09b` and this TypeORM adapter, and generate a follow-up migration (`-n AddMailSendStatus`) consistent with the CLI from `P03-03a`. This atomic depends on `P03-09b` and completes the status-store port's adapter coverage. Atomic checks: (a) one shared spec, both adapters pass unchanged, (b) migration creates the table with an index on `job_id`, (c) no business rules outside `P03-09a`.
- **CLI(s)**: `npm run migration:generate -- -n AddMailSendStatus`; `npm run migration:run`; `npm run test:unit -- mail`; `npm run test:cov`.
- **Package(s)**: `None` — reuses TypeORM from `P03-01b` and the CLI from `P03-03a`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/mail/infrastructure/typeorm-mail-status-store.adapter.ts`, `src/modules/mail/infrastructure/typeorm-mail-status-store.adapter.spec.ts`, `src/modules/mail/infrastructure/mail-status-store.conformance.spec.ts`, `src/migrations/<timestamp>-AddMailSendStatus.ts`
  - **Modified**: `src/modules/mail/mail.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/mail-send-status` (shared)
- **Commit**: `feat(mail): add typeorm status store and conformance spec`
- **Testing**: The conformance spec asserts identical set/get/list results for both adapters with `vi.fn()` factories and fake timers for timestamps; the migration spec asserts the `job_id` index and `down()` drop; coverage thresholds met for both adapters.

### `P03-09d` — Emit status transitions from producer and worker
- **Description**: Update the producer from `P03-07e` to write `QUEUED` with the generated job id before enqueueing, and the worker from `P03-08d` to write `PROCESSING` on receipt, then `SENT` after a successful `MAIL_PORT.send()` or `FAILED` on rejection, routing all writes through `MAIL_STATUS_STORE` and guarding them with `canTransition()` from `P03-09a`. Do not catch-and-swallow errors: failed sends remain observable to `P03-09e`. This atomic depends on `P03-09c` and supplies the state machine the abandonment hooks read. Atomic checks: (a) four transitions emitted on the happy/failure paths, (b) illegal transitions rejected by the guard, (c) status writes injectable via `vi.fn()` store mocks.
- **CLI(s)**: `npm run test:unit -- mail`; `npm run test:e2e -- mail`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/mail/application/mail-status-tracker.ts`, `src/modules/mail/application/mail-status-tracker.spec.ts`
  - **Modified**: `src/modules/mail/application/mail-queue.producer.ts`, `src/modules/mail/application/mail-queue.worker.ts`, `src/modules/mail/application/mail-queue.worker.spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/mail-send-status` (shared)
- **Commit**: `feat(mail): emit send-status transitions from producer and worker`
- **Testing**: `mail-status-tracker.spec.ts` uses `vi.fn()` on `MailStatusStore.set` to assert exact transition sequences for success and failure; the E2E asserts the in-memory store ends at `SENT`; coverage thresholds unchanged.

### `P03-09e` — Add queue abandonment hooks
- **Description**: Wire queue-level failure signals to the terminal `ABANDONED` state: in the BullMQ adapter from `P03-06c`, listen for exhausted retries/`failed`/`stalled` on the `mail` queue and call the tracker from `P03-09d`; in the in-memory fallback from `P03-06e`, emit the equivalent event when retries are exhausted so behaviour is identical. Never transition out of `ABANDONED`, and ensure an abandoned job cannot trigger a duplicate send. This atomic depends on `P03-09d` and completes the mail lifecycle plus the P03 exit criterion. Atomic checks: (a) both adapters drive the same transition, (b) terminal state is final, (c) E2E proves a permanently failing job is abandoned with exactly one attempted send.
- **CLI(s)**: `npm run test:unit -- mail`; `npm run test:e2e -- mail`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `test/mail-abandonment.e2e-spec.ts`, `src/modules/mail/application/mail-abandonment.hook.ts`, `src/modules/mail/application/mail-abandonment.hook.spec.ts`
  - **Modified**: `src/modules/shared/infrastructure/queue/bullmq-queue.adapter.ts`, `src/modules/shared/infrastructure/queue/in-memory-queue.adapter.ts`, `src/modules/mail/mail.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/mail-send-status` (shared)
- **Commit**: `feat(mail): add queue abandonment hooks for send status`
- **Testing**: `mail-abandonment.hook.spec.ts` uses `vi.fn()` to simulate exhausted retries and asserts a single `ABANDONED` write with no `SENT`; `test/mail-abandonment.e2e-spec.ts` runs the scenario against the in-memory queue/transport with a permanently failing `vi.fn()` mail adapter and asserts no duplicate send; coverage thresholds met.

## Phase Gate (end of step)

- [x] Full unit tests + coverage thresholds pass.
- [x] MAIL port conformance spec passes unchanged for the SMTP adapter (mocked transport) **and** the in-memory fallback.
- [x] E2E verifies enqueue → worker → localised render → transport → status with only in-memory adapters, and abandonment for a permanently failing job.
- [x] Both MAIL and MAIL_STATUS_STORE ports have one conformance spec each, run against every adapter.
- [x] Templates localised for all configured locales; no PII/secrets in templates, logs or OpenAPI examples.
- [x] Typed config validated; lint/format/typecheck clean; security audit & version sync pass.
- [x] Each atomic commit pushed on its shared branch; PR merged into `dev` in this exact order:
  `P03-07a` → `P03-07b` → `P03-07c` → `P03-07d` → `P03-07e` → `P03-07f` → `P03-08a` → `P03-08b` → `P03-08c` → `P03-08d` → `P03-09a` → `P03-09b` → `P03-09c` → `P03-09d` → `P03-09e`.
- [x] Status for umbrella IDs `P03-07`, `P03-08`, `P03-09` set to `✅ Done` in [`roadmap.md`](../../../roadmap.md) §4 (atomic IDs tracked here).
- [x] Re-check the P03 exit criterion in [`roadmap.md`](../../../roadmap.md) §6.1 before starting the next step.
