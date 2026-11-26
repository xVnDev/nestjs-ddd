# nestjs-ddd — Master Roadmap

> **DDD-first, secure-by-default NestJS 12 production boilerplate.**
> This document is the single source of truth for *what* gets built, *in what order*, and *what "done" means*.
> Step-level execution checklists live in `.opencode/plans/<phase-folder>/`.

---

## Document Control

| Field | Value |
| :---- | :---- |
| **Project** | `nestjs-ddd` |
| **Repository** | `xVnDev/nestjs-ddd` |
| **Branch Model** | `master` (stable) → `dev` (integration) → task branches |
| **Document Version** | `1.0.0` — greenfield roadmap |
| **Created** | 2026-11-23 |
| **Status** | Active baseline |
| **Framework** | NestJS 12, TypeScript strict mode, Node.js LTS |
| **Architecture** | Domain-Driven Design (tactical) + SOLID, ports & adapters |
| **Compliance Targets** | ISO/IEC 27001:2022 Annex A · OWASP ASVS 4.0 L2 · HIPAA Security Rule §164.312 · GDPR Art. 32 |
| **CI Runner** | `ubuntu-latest` |
| **Release Target** | `v1.0.0` |
| **Planning System** | `roadmap.md` (canonical) → `.opencode/plans/INDEX.md` → `.opencode/plans/<phase>/<step>.md` |

---

## 1. Vision & Scope

### 1.1 Vision

A NestJS 12 boilerplate that teams can clone on day one for a production product and inherit a **correct architecture, a swappable security core, and auditable compliance controls** — instead of inheriting a pile of ad-hoc patterns. Domain-Driven Design provides the boundaries and language; SOLID keeps those boundaries substitutable; NestJS 12 first-party modules do the heavy lifting.

### 1.2 Goals

| # | Goal |
| :- | :--- |
| G1 | Express every business capability as a bounded context with clean layer dependencies. |
| G2 | Make every security-sensitive mechanism swappable behind a narrow port without editing a use case. |
| G3 | Run the entire stack locally with zero external services via first-class in-memory adapters. |
| G4 | Ship secure-by-default HTTP surface: validated input, security headers, rate limits, audited auth. |
| G5 | Prove quality with layered automated tests and enforced coverage at every step. |
| G6 | Produce evidence mapping implemented controls to international security standards. |

### 1.3 Non-Goals

- No "DDD theatre": no aggregate, value object or port where a plain class or config value suffices.
- No reimplementation of capabilities NestJS 12 already provides natively.
- No product/business features — this is an identity-and-platform foundation only.
- No security controls added without a threat and a control mapping (§11).

### 1.4 Success Metrics

| Metric | Target |
| :----- | :----- |
| Unit + E2E pass rate at every Phase Gate | 100% |
| Coverage thresholds | Enforced in CI, no bypass |
| Ports with conformance specs across all adapters | 100% |
| High/critical dependency or SAST findings at merge | 0 |
| External services required for local dev | 0 |
| Compliance controls with a code location | 100% of §11 rows |

---

## 2. Architecture Thesis

1. **Bounded contexts = feature modules.** `src/modules/<context>/` owns `domain/`, `application/`, `infrastructure/`, `interfaces/`. Dependencies point inward only.
2. **Ports are the seam.** Domain and application code depend on interfaces bound to DI tokens; adapters implement them. Swapping Redis → memory, Argon2id → another KDF, or SMTP → a custom provider is a token rebind.
3. **Conformance over convention.** A port is only trusted once one shared spec passes against every adapter, fallbacks included.
4. **Thin edges.** Controllers translate HTTP ↔ use cases. Guards, strategies and DTOs carry no business rules.
5. **Security is a first-class context.** `security` and `alerts` are bounded contexts, not helper folders — because they carry real invariants (token families, revocation scopes, send status, audit events).
6. **Config is data, not behaviour.** Small typed config files are exported as `as Provider()` values for `.forRootAsync()` / `.registerAsync()`.

---

## 3. Technology Baseline

| Concern | Choice | Note |
| :------ | :----- | :--- |
| Framework | NestJS 12, TypeScript strict | Prefer native `@nestjs/*` APIs. |
| Config | `@nestjs/config`, Joi, `registerAs` | Typed env, fail-fast validation. |
| HTTP surface | `ValidationPipe` (whitelist/transform), native `useSecurityHeaders()`, `@scalar/nestjs-api-reference` | Swagger setup runs before security headers. |
| Bootstrap | `enableShutdownHooks()` | Graceful shutdown. |
| Testing | Vitest + Supertest, faker fixtures | `vi.fn()` for every mock. |
| Linting/formatting | Oxlint (type-aware) + Prettier | NestJS CLI init output; no ESLint; `oxlint --type-aware src/ test/`. |
| Persistence | TypeORM + PostgreSQL, soft delete | Migrations checked in CI. |
| Cache / blacklist | Keyv + Redis, memory fallback | Shared port. |
| Queue | BullMQ, memory fallback | Named queues, producer/worker split. |
| Mail | NestJS mail + Handlebars + `nestjs-i18n` | Async via queue; pluggable provider. |
| Auth | Passport local/JWT/OAuth2, Argon2id, RS256 + `kid` | Rotation & revocation in later phases. |
| Platform | `@nestjs/throttler`, idempotency, resilience, `@nestjs/observe` | Basic config early, hardening later. |
| Observability | OpenTelemetry + Prometheus, structured JSON logger | Added in Phase 9. |
| Security CI | Dependabot, CodeQL, Snyk, Codacy, SonarCloud | All on `ubuntu-latest`. |

---

## 4. Canonical Task Backlog

Status legend: ⬜ Planned · 🚧 In progress · ✅ Done · ⏸ Blocked · ❌ Cancelled.

| ID | Phase | Step | Task | Status |
| :-- | :---- | :--- | :---- | :----- |
| `P0-01` | P0 · Governance & Planning | 1 | `chore(repo): initialize nestjs-ddd repository, branch model and PR governance` | ✅ Done |
| `P0-02` | P0 · Governance & Planning | 1 | `chore(plan): scaffold roadmap, phase plans and prompt templates` | ✅ Done |
| `P01-01` | P01 · Foundation | 1 | `chore(core): scaffold nestjs 12 app with strict ts, oxlint, prettier, editorconfig, health & readiness endpoints` | ✅ Done |
| `P01-02` | P01 · Foundation | 1 | `chore(test): add vitest unit/e2e setup with coverage thresholds` | ✅ Done |
| `P01-03` | P01 · Foundation | 1 | `chore(test): add faker-backed fixture factories` | ✅ Done |
| `P01-04` | P01 · Foundation | 2 | `feat(config): add typed env validation with joi and registerAs providers` | ✅ Done |
| `P01-05` | P01 · Foundation | 2 | `feat(config): add global ValidationPipe with whitelist and transform` | ✅ Done |
| `P01-06` | P01 · Foundation | 2 | `feat(core): add structured logger with redaction (console dev, JSON prod)` | ✅ Done |
| `P01-07` | P01 · Foundation | 2 | `feat(sec): add native security headers and graceful shutdown hooks` | ✅ Done |
| `P01-08` | P01 · Foundation | 3 | `feat(api): add OpenAPI + Scalar with bearer scheme, user/admin instances` | ✅ Done |
| `P01-09` | P01 · Foundation | 3 | `feat(api): add faker-backed OpenAPI examples` | ✅ Done |
| `P01-10` | P01 · Foundation | 3 | `docs(project): add README, LICENSE, SECURITY.md and CHANGELOG.md` | ✅ Done |
| `P02-01` | P02 · DDD/SOLID Skeleton | 1 | `feat(arch): establish bounded-context folder layout and shared kernel` | ✅ Done |
| `P02-02` | P02 · DDD/SOLID Skeleton | 1 | `feat(arch): define port tokens and narrow interfaces for swappable mechanisms` | ✅ Done |
| `P02-03` | P02 · DDD/SOLID Skeleton | 1 | `chore(test): add conformance-test harness shared by all port adapters` | ✅ Done |
| `P02-04` | P02 · DDD/SOLID Skeleton | 2 | `feat(domain): add base entity, value-object base and domain error/result types` | ✅ Done |
| `P02-05` | P02 · DDD/SOLID Skeleton | 2 | `feat(api): add global exception filter mapping domain errors to HTTP` | ✅ Done |
| `P02-06` | P02 · DDD/SOLID Skeleton | 2 | `chore(test): add architecture dependency-rule guard test` | ✅ Done |
| `P03-01` | P03 · Data & Infrastructure | 1 | `feat(db): register TypeORM PostgreSQL async config` | ✅ Done |
| `P03-02` | P03 · Data & Infrastructure | 1 | `feat(db): add soft-delete base entity and repository port` | ⬜ Planned |
| `P03-03` | P03 · Data & Infrastructure | 1 | `feat(db): generate initial migration and add migration CI check` | ⬜ Planned |
| `P03-04` | P03 · Data & Infrastructure | 2 | `feat(cache): add Keyv Redis adapter with boilerplate namespace` | ⬜ Planned |
| `P03-05` | P03 · Data & Infrastructure | 2 | `feat(cache): add in-memory cache fallback adapter and conformance spec` | ⬜ Planned |
| `P03-06` | P03 · Data & Infrastructure | 2 | `feat(queue): add BullMQ adapter, in-memory fallback and queue port conformance` | ⬜ Planned |
| `P03-07` | P03 · Data & Infrastructure | 3 | `feat(mail): define mail port, transport adapter and named queue producer/worker` | ⬜ Planned |
| `P03-08` | P03 · Data & Infrastructure | 3 | `feat(mail): add i18n Handlebars templates and render service` | ⬜ Planned |
| `P03-09` | P03 · Data & Infrastructure | 3 | `feat(mail): add send-status tracking and queue abandonment hooks` | ⬜ Planned |
| `P03-10` | P03 · Data & Infrastructure | 4 | `feat(infra): add first-party HTTP client adapter for outbound calls` | ⬜ Planned |
| `P03-11` | P03 · Data & Infrastructure | 4 | `feat(infra): add basic global throttler configuration` | ⬜ Planned |
| `P03-12` | P03 · Data & Infrastructure | 4 | `feat(infra): add basic idempotency middleware` | ⬜ Planned |
| `P03-13` | P03 · Data & Infrastructure | 4 | `feat(infra): add basic resilience/circuit-breaker configuration` | ⬜ Planned |
| `P04-01` | P04 · Identity Domain | 1 | `feat(user): model User aggregate with sub identity value object` | ⬜ Planned |
| `P04-02` | P04 · Identity Domain | 1 | `feat(user): add Argon2id password hasher adapter plus conformance spec` | ⬜ Planned |
| `P04-03` | P04 · Identity Domain | 1 | `feat(user): add user repository port, TypeORM adapter and conformance spec` | ⬜ Planned |
| `P04-04` | P04 · Identity Domain | 2 | `feat(user): add admin DTOs and RBAC guard placeholder` | ⬜ Planned |
| `P04-05` | P04 · Identity Domain | 2 | `feat(user): add admin CRUD use cases and controller` | ⬜ Planned |
| `P04-06` | P04 · Identity Domain | 2 | `chore(test): add admin API E2E coverage` | ⬜ Planned |
| `P05-01` | P05 · Authentication | 1 | `feat(auth): implement local strategy with Argon2id verification` | ⬜ Planned |
| `P05-02` | P05 · Authentication | 1 | `feat(auth): expose local login endpoint` | ⬜ Planned |
| `P05-03` | P05 · Authentication | 1 | `feat(auth): add RS256 key pair config with kid` | ⬜ Planned |
| `P05-04` | P05 · Authentication | 1 | `feat(auth): add token issuer port/adapter, JWT strategy and guard` | ⬜ Planned |
| `P05-05` | P05 · Authentication | 2 | `feat(auth): implement refresh rotation with reuse detection` | ⬜ Planned |
| `P05-06` | P05 · Authentication | 2 | `feat(auth): add token blacklist port with Redis/memory adapters and TTL cleanup` | ⬜ Planned |
| `P05-07` | P05 · Authentication | 2 | `feat(auth): add logout and multi-scope revocation (account/user/device/session)` | ⬜ Planned |
| `P05-08` | P05 · Authentication | 3 | `feat(auth): add RBAC role model, decorator and guard` | ⬜ Planned |
| `P05-09` | P05 · Authentication | 3 | `feat(auth): seed roles and protect admin APIs` | ⬜ Planned |
| `P06-01` | P06 · Federated Identity | 1 | `feat(auth): add generic OAuth2 strategy factory and profile normalizer` | ⬜ Planned |
| `P06-02` | P06 · Federated Identity | 1 | `feat(auth): add link-or-create with verified-email merge gate` | ⬜ Planned |
| `P06-03` | P06 · Federated Identity | 2 | `feat(auth): add Google OAuth2 provider adapter` | ⬜ Planned |
| `P06-04` | P06 · Federated Identity | 2 | `feat(auth): add Microsoft OAuth2 provider adapter` | ⬜ Planned |
| `P06-05` | P06 · Federated Identity | 2 | `feat(auth): add GitHub OAuth2 provider adapter` | ⬜ Planned |
| `P06-06` | P06 · Federated Identity | 2 | `feat(auth): add Apple OAuth2 provider adapter` | ⬜ Planned |
| `P06-07` | P06 · Federated Identity | 2 | `feat(auth): add X OAuth2 provider adapter` | ⬜ Planned |
| `P07-01` | P07 · End-user Auth APIs | 1 | `feat(auth): add registration use case and API` | ⬜ Planned |
| `P07-02` | P07 · End-user Auth APIs | 1 | `feat(auth): add end-user login API with verification mail hook` | ⬜ Planned |
| `P07-03` | P07 · End-user Auth APIs | 2 | `feat(auth): add forgot-password request with queued mail` | ⬜ Planned |
| `P07-04` | P07 · End-user Auth APIs | 2 | `feat(auth): add reset-password handler and token invalidation` | ⬜ Planned |
| `P07-05` | P07 · End-user Auth APIs | 3 | `feat(auth): add change-password use case, API and token revocation` | ⬜ Planned |
| `P07-06` | P07 · End-user Auth APIs | 3 | `chore(test): add E2E coverage for all self-service auth flows` | ⬜ Planned |
| `P08-01` | P08 · Advanced Security | 1 | `feat(sec): add timing-attack defense with dummy hash` | ⬜ Planned |
| `P08-02` | P08 · Advanced Security | 1 | `feat(sec): add breach-list password policy port and adapter` | ⬜ Planned |
| `P08-03` | P08 · Advanced Security | 1 | `feat(auth): add account lockout and identity-verified self-unlock` | ⬜ Planned |
| `P08-04` | P08 · Advanced Security | 2 | `feat(sec): add TOTP enrollment, toggle and login verify challenge` | ⬜ Planned |
| `P08-05` | P08 · Advanced Security | 2 | `feat(sec): encrypt TOTP secrets and issue recovery codes` | ⬜ Planned |
| `P08-06` | P08 · Advanced Security | 2 | `feat(sec): add OTP port, adapter and request/verify endpoints` | ⬜ Planned |
| `P08-07` | P08 · Advanced Security | 2 | `feat(sec): add magic-link request and verify flows` | ⬜ Planned |
| `P08-08` | P08 · Advanced Security | 3 | `feat(sec): add device-token port, adapter and validation` | ⬜ Planned |
| `P08-09` | P08 · Advanced Security | 3 | `feat(sec): add dual rate limiting (per IP and per account)` | ⬜ Planned |
| `P08-10` | P08 · Advanced Security | 4 | `feat(sec): add security audit log port and sensitive-event instrumentation` | ⬜ Planned |
| `P08-11` | P08 · Advanced Security | 4 | `feat(crypto): add versioned secrets-rotation service` | ⬜ Planned |
| `P09-01` | P09 · Hardening & Observability | 1 | `feat(sec): add sliding-window rate limiting` | ⬜ Planned |
| `P09-02` | P09 · Hardening & Observability | 1 | `feat(resilience): add circuit breaker for third-party calls` | ⬜ Planned |
| `P09-03` | P09 · Hardening & Observability | 1 | `feat(crypto): add AES-256-GCM key rotation` | ⬜ Planned |
| `P09-04` | P09 · Hardening & Observability | 1 | `feat(db): add AES-256-GCM field-level encryption at rest` | ⬜ Planned |
| `P09-05` | P09 · Hardening & Observability | 1 | `feat(auth): add temporary and permanent account lockout` | ⬜ Planned |
| `P09-06` | P09 · Hardening & Observability | 2 | `feat(observability): bootstrap OpenTelemetry SDK and instrumentation` | ⬜ Planned |
| `P09-07` | P09 · Hardening & Observability | 2 | `feat(observability): expose Prometheus metrics endpoint` | ⬜ Planned |
| `P09-08` | P09 · Hardening & Observability | 2 | `feat(observability): add alerting with Telegram/Slack/Discord/email adapters` | ⬜ Planned |
| `P09-09` | P09 · Hardening & Observability | 3 | `docs(sec): map controls to ISO 27001, OWASP ASVS, HIPAA and GDPR` | ⬜ Planned |
| `P09-10` | P09 · Hardening & Observability | 3 | `chore(release): update version badge and tag v1.0.0` | ⬜ Planned |
| `P10-01` | P10 · Delivery & Benchmark | 1 | `feat(infra): add production Docker and deploy configuration` | ⬜ Planned |
| `P10-02` | P10 · Delivery & Benchmark | 1 | `feat(infra): add production CI/CD deploy workflow, runbook with rollback, backup/restore and DR` | ⬜ Planned |
| `P10-03` | P10 · Delivery & Benchmark | 1 | `chore(perf): add performance benchmark and record baseline` | ⬜ Planned |



---

## 5. Conventions & Guardrails

### 5.1 Layer Map

| Layer | Folder | Contains | Dependency rule |
| :---- | :----- | :------- | :-------------- |
| Domain | `domain/` | Entities, value objects, domain services, port interfaces, domain events | Pure — no Nest, TypeORM, Redis or HTTP imports |
| Application | `application/` (auth: `use-cases/`) | Use cases, query handlers | Orchestrates via ports; no transport or persistence detail |
| Infrastructure | `infrastructure/`, `adapters/` | TypeORM repos, cache, queue, mail, crypto, TOTP, notifiers | Implements ports; injected by token |
| Interfaces | `interfaces/`, controllers, DTOs, strategies, guards | HTTP controllers, DTOs, Passport strategies/guards, response mappers | Thin translation; no business rules |

### 5.2 Port & Adapter Rules

- `src/modules/shared/` owns cross-context tokens (`PASSWORD_HASHER`, `TOKEN_ISSUER`, `ENCRYPTION_SERVICE`, `ID_GENERATOR`, `CLOCK`) and default adapters. Contexts rebind tokens; they never redefine the port.
- `src/common/` is domain-free and must never import a context's `domain/`.
- A port is introduced only for a mechanism that must be swappable or isolated in tests. Config values and DTOs are not ports.
- Every port ships one conformance spec executed against **all** adapters, including in-memory fallbacks. A new adapter is accepted only when that spec passes unchanged.
- Memory fallbacks are production-shaped first-class adapters — never throwaway test stubs.

### 5.3 SOLID Mapping

| Principle | Practice |
| :-------- | :------- |
| SRP | One use case or adapter per class |
| OCP | Rebind a token / add an adapter instead of editing a use case |
| LSP | Interchangeability proven by conformance specs |
| ISP | Narrow, consumer-specific ports |
| DIP | Domain/application depend on port tokens only |

### 5.4 Reference Shape

```
src/
├── main.ts                 # setupOpenApi() → useSecurityHeaders() → listen + enableShutdownHooks()
├── app.module.ts
├── common/
│   ├── config/             # typed, Joi-validated, exported as Provider()
│   ├── logger/             # structured JSON logger + redaction
│   ├── middleware/         # idempotency, throttling, audit hooks
│   └── crypto/             # AES-256-GCM helpers, key rotation
└── modules/
    ├── shared/             # port tokens + default adapters; cache/blacklist ports + adapters; HTTP client; shared domain primitives
    ├── user/               # domain · application · infrastructure · interfaces
    ├── auth/               # domain · use-cases · strategies · guards · adapters
    ├── mail/               # domain · application · adapters · workers
    ├── security/           # MFA, OTP, magic link, device, audit, policies
    └── alerts/             # notifier ports + channel adapters
```

### 5.5 Non-Negotiable Practices

1. Prefer NestJS 12 first-party modules over hand-rolled infrastructure.
2. Business rules live in entities, value objects and use cases — not controllers.
3. Config is split into small typed files exported as `as Provider()` for `.forRootAsync()` / `.registerAsync()`.
4. Value objects, aggregates and domain events are added only when invariants or multi-entity consistency demand them.
5. All Vitest mocks use `vi.fn()`; fixtures come from faker factories.
6. No secrets or PII in logs, errors, docs or OpenAPI examples.

---

## 6. Phase Plan

| Phase | Name | Steps | Outcome |
| :---- | :---- | :---- | :------ |
| P0 | Governance & Planning | 1 | Repo governance + planning system |
| P01 | Foundation | 3 | Bootable app, typed config, secure HTTP surface, docs, test infra |
| P02 | DDD/SOLID Skeleton | 2 | Context layout, ports, conformance harness, architecture guard |
| P03 | Data & Infrastructure | 4 | Postgres, cache, queue, mail, platform clients — all with fallbacks |
| P04 | Identity Domain | 2 | User aggregate, hashing/repository ports, admin CRUD |
| P05 | Authentication | 3 | Local + RS256 JWT, refresh/blacklist/revocation, RBAC |
| P06 | Federated Identity | 2 | Generic OAuth2 base + five provider adapters |
| P07 | End-user Auth APIs | 3 | Register, login, recovery, change password |
| P08 | Advanced Security | 4 | Credential hardening, MFA/OTP/magic link, device, audit, rotation |
| P09 | Hardening & Observability | 3 | Rate limits, encryption, key rotation, OTel/Prometheus, alerts, release |
| P10 | Delivery & Benchmark | 1 | Production deploy config, CI/CD, performance baseline |

### 6.1 Phase Exit Criteria

| Phase | Exit criterion |
| :---- | :------------- |
| P0 | Roadmap, index, step plans and prompts exist and reference `nestjs-ddd`. |
| P01 | App boots with Joi-validated config, security headers, validation, docs, logging, graceful shutdown; coverage thresholds live. |
| P02 | Context skeleton + port tokens + conformance harness + passing architecture guard test. |
| P03 | Full stack runs with no external services; migrations apply; mail queue and templates verified E2E; all fallback adapters conform. |
| P04 | User aggregate supports local + federated identity via `sub`; admin CRUD protected and tested. |
| P05 | Login → tokens → refresh → logout → revocation works; RBAC protects admin APIs; timing defence present. |
| P06 | One generic OAuth2 base, five thin adapters, verified-email merge gate, no duplicate users. |
| P07 | All self-service flows E2E covered including failure paths and mail side effects. |
| P08 | Every new security port has conformance specs; audit events emitted; secrets versioned. |
| P09 | Control mapping doc complete; metrics and alerts live; `v1.0.0` tagged. |
| P10 | Reproducible production deploy documented; benchmark baseline recorded. |

---

### 6.2 Infrastructure & Deployment Coverage

| Concern | Coverage | Primary tasks |
| :------ | :------- | :------------ |
| Persistence & migrations | TypeORM + Postgres, soft delete, migration CI | Phase 3, step 1 |
| Cache / blacklist (Redis + memory) | Shared port, conformance specs | Phase 3, step 2 |
| Queue (BullMQ + memory fallback) | Named queues, producer/worker | Phase 3, step 2 |
| Mail (async, i18n templates, send status) | Pluggable provider, queue-backed | Phase 3, step 3 |
| Outbound HTTP, throttler, idempotency, resilience | First-party adapters + basic config | Phase 3, step 4 |
| Health / readiness probes | Health module + container healthcheck | Phase 1 step 1, Phase 10 step 1 |
| Secrets & config | Joi-validated typed config, runtime env only | Phase 1 step 2, Phase 10 step 1 |
| Observability (OTel, Prometheus, alerts) | SDK, metrics, notifiers | Phase 9, step 2 |
| Hardening (rate limits, encryption, lockout) | Sliding window, AES-256-GCM, lockout | Phase 9, step 1 |
| Container image (secret-free, non-root) | Multi-stage Dockerfile, smoke test | Phase 10, step 1 |
| CI/CD deploy (OIDC, protected env, rollback) | Workflow + runbook | Phase 10, step 1 |
| Performance baseline | Repeatable benchmark + recorded baseline | Phase 10, step 1 |

> Backup/restore and DR steps are captured in the production runbook (Phase 10); horizontal scaling stays stateless by design (no in-process session state).

## 7. Execution Order & Parallelism

```
P0 → P01 → P02 → P03 → P04 → P05 → ( P06 ∥ P07 ) → P08 → P09 → P10
```

- **Strict sequential**: P0 → P01 → P02 → P03 → P04 → P05.
- **Parallel stream**: P06 ∥ P07 (branch from a common `dev` base; tasks may also run in parallel when independent).
- **Strict sequential after merge**: P08 → P09 → P10.
- Within a phase, steps run in ascending order unless the step plan states otherwise.

**Policy**: one task = one branch = one commit; merge back to `dev` at the Phase Gate.

---

## 8. Phase Gate / Definition of Done

> ⚠️ **Pause & Push.** Execution **must stop** at the end of every step. The next step may not start until this checklist is fully green.

- [ ] Step tasks match the canonical backlog and its step plan.
- [ ] Unit tests pass; domain/use cases tested with ports mocked via `vi.fn()`.
- [ ] E2E tests pass at the interfaces layer, including the in-memory fallback path.
- [ ] Coverage thresholds met; conformance specs pass for every adapter of any touched port.
- [ ] Typed config validated; no secrets or PII committed.
- [ ] Lint, format, typecheck clean.
- [ ] Package security audit and version sync executed.
- [ ] Step branch pushed, PR opened and merged into `dev`.
- [ ] Backlog status and step plan updated; phase exit criteria re-checked.

Before the next step: prefer NestJS 12 built-ins (config, HTTP client, throttle, idempotency, resilience, cache, queue, mail); keep config in small typed `as Provider()` files.

---

## 9. Testing Strategy

| Level | Target | Rule |
| :---- | :----- | :--- |
| Domain unit | entities, value objects, policies | Framework-free |
| Use-case unit | application / use-cases | Ports mocked with `vi.fn()` |
| Adapter conformance | one spec per port | Unchanged across Redis/memory, real/fallback |
| E2E | controllers, guards, strategies | Real Nest app, faker fixtures, negative paths |
| Migration | TypeORM | Apply + revert on clean Postgres in CI |
| Security | SAST/deps | Dependabot, CodeQL, Snyk, Codacy, SonarCloud |
| Performance | P10 | Baseline recorded |

---

## 10. Branching, Commits & Release

- **Branches**: `master` (stable) → `dev` (integration) → task branches cut from `dev`.
- **Naming**: `feat/<scope>-<kebab-subject>`, `chore/<scope>-<kebab-subject>`, `ci/<scope>-<kebab-subject>`.
- **Commits**: Conventional Commits, one task per commit, reference the task ID.
- **Numbering**: umbrella tasks use sequential numbers when committed on separate branches; atomic sub-tasks sharing one branch use letters (for example `PXX-YYa`, `PXX-YYb`). See §14.
- **PR**: after each step's Phase Gate → push → PR → merge into `dev`.
- **Release**: after P09 → the release task updates badge and tags `v1.0.0`.

---

## 11. Security & Compliance Traceability

| Control | ISO 27001:2022 | OWASP ASVS 4.0 | HIPAA §164.312 | GDPR | Code location |
| :------ | :------------- | :-------------- | :------------- | :---- | :------------ |
| Argon2id hashing + dummy-hash timing defence | A.5.15, A.8.24 | V2.1 | (d) Access Control | Art. 32(1)(a) | `src/modules/user/adapters/`, `src/modules/security/` |
| Native security headers | A.8.20 | V14.4 | (e) Transmission | Art. 32(1)(a) | `src/main.ts` |
| Validation, whitelist, exception filter | A.8.29 | V5.1 | (c) Integrity | Art. 32(1)(b) | `src/common/`, `src/main.ts` |
| Field-level AES-256-GCM encryption | A.8.24 | V8.3 | (a)(2)(iv) | Art. 32(1)(a) | `src/common/crypto/` |
| RS256 + `kid` rotation, blacklist, revocation | A.5.17, A.8.24 | V3.5, V3.3 | (d) Session integrity | Art. 32(1)(b) | `src/modules/auth/` |
| MFA, OTP, magic link, recovery codes | A.5.17 | V2.8 | (d) | Art. 32(1)(b) | `src/modules/security/` |
| Idempotency, throttling, circuit breaker | A.8.23 | V11.1 | (c) System integrity | Art. 32(1)(b) | `src/common/middleware/` |
| Audit logging + secrets rotation | A.8.15, A.5.17 | V7.2 | (b) Audit controls | Art. 32(1)(d) | `src/modules/security/` |
| Dependency & SAST pipelines | A.8.8, A.8.29 | V14.2 | (b) | Art. 32(1)(d) | `.github/workflows/` |

> The control-mapping task reconciles every shipped control with this table and records residual gaps.

---

## 12. Risk Register

| Risk | Mitigation |
| :--- | :--------- |
| DDD ceremony slows delivery | Guardrails §5.2 — ports/value objects only where justified |
| Memory fallback drifts from real adapter | One conformance spec run against every adapter |
| Late security changes force rewrites | Ports introduced in P02; policies slot in without touching use cases |
| Secret/PII leakage | Redacting logger, Joi env, Phase Gate audit |
| OAuth duplication or merge abuse | Verified-email gate, one normalizer, E2E negative tests |
| Parallel branch drift | Common-base branches + task-per-branch + Phase Gate merge |
| Compliance evidence gap | Traceability matrix maintained from day one, reconciled in P09 |

---

## 13. Glossary

| Term | Meaning |
| :--- | :------ |
| Bounded context | Feature module under `src/modules/` owning its layers |
| Port | Narrow interface bound to a DI token |
| Adapter | Concrete implementation of a port |
| Conformance spec | Shared test suite every adapter of a port must pass |
| `sub` | Stable identity linking local and federated identities |
| Refresh-token family | Tokens descended from one login, basis for reuse detection |
| Revocation scope | account / user / device / session |
| Send status | Lifecycle of a queued mail job |
| Phase Gate | Mandatory pause + test + audit + push + merge |

---

## 14. Planning System Map

| Path | Role |
| :--- | :--- |
| `roadmap.md` | Canonical backlog, architecture, gates, compliance — this file |
| `.opencode/plans/INDEX.md` | Navigation across all phase/step plans |
| `.opencode/plans/<phase>/<step>.md` | Atomic breakdown for one step; an umbrella task splits into lettered atomics (one atomic = one commit, siblings share a branch) |
| `.opencode/prompts/roadmap-step.md` | Prompt to break down the active step |
| `.opencode/prompts/phase-gate.md` | Prompt to run the Phase Gate checklist |

When a task completes: set its status to ✅ in §4, tick its checkbox in the step plan, and re-check the phase exit criteria in §6.1.
