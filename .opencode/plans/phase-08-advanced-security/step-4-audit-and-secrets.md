# P08 · Step 4 — Audit & Secrets

**Project:** nestjs-ddd  |  **Phase:** P08 — Advanced Security  |  **Base branch:** `dev`  |  **Status:** ⬜ Planned

> Source of truth: [`roadmap.md`](../../../roadmap.md) §4. Umbrella IDs `P08-10`, `P08-11` stay in the roadmap; this file lists the final atomic split (`P08-10a` … `P08-11e`).
> **Format**: `P<phase>-<umbrella><letter>` — one atomic task = one commit; sibling atomic tasks share one branch (branch per umbrella task). Every atomic task uses the 7-field format: `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing`.
> **Ordering notes**: (a) `P08-10a` defines the structured `AuditEvent` model and redaction rules plus the `AuditLogPort`; `P08-10b`/`P08-10c` add the memory fallback and append-only Postgres adapter under one conformance suite; `P08-10d` instruments sensitive events through a single emitter; `P08-10e` proves emission end-to-end with PII-redaction assertions. (b) `P08-11a` defines the versioned-secret model and store port; `P08-11b`/`P08-11c` add the memory and persistent adapters under one conformance suite; `P08-11d` wires the rotation service into JWT signing (`P05-03`/`P05-04`) and encryption consumers so old and new versions coexist; `P08-11e` adds the operational CLI/runbook and audit integration. No real secret values ever appear in fixtures, migrations or logs.

## DDD + SOLID lens for this step

- Bounded contexts own `domain/`, `application/`, `infrastructure/`, `interfaces/`; dependencies point inward.
- Domain/application depend only on port tokens; adapters are injected, never imported directly.
- Every port ships one conformance spec run against all adapters, including in-memory fallbacks.
- Business rules live in entities/value objects/use cases; controllers stay thin.
- Introduce a port only when a mechanism must be swappable or isolated for tests.

## Step Summary

Close the phase with two cross-cutting controls in the `security` bounded context. A structured, PII-free `AuditEvent` is emitted for every sensitive action through an `AuditLogPort` with an in-memory fallback and an append-only Postgres adapter (plus migration), both passing one conformance suite; a single emitter keeps controllers and use cases thin. A versioned secrets-rotation service stores secrets through a `VersionedSecretStore` port with memory and persistent adapters and lets JWT signing keys and encryption keys carry a version/`kid` so old and new values coexist through a grace window before the old version is retired. Every new port is conformance-tested across all adapters; fixtures use faker-generated dummy values only.

## Atomic Tasks

### `P08-10a` — Define the audit event model, redaction rules and port
- **Description**: Create a structured `AuditEvent` value object in `src/modules/security/domain/` with fields `actorId`, `action`, `target`, `outcome`, `ipHash`, `userAgentHash`, `correlationId`, `occurredAt` and `metadata`, and a `redactAuditMetadata()` helper that strips passwords, tokens, codes, emails and raw IPs. Define `AuditLogPort` + `AUDIT_LOG` token in `src/modules/security/domain/ports/audit-log.port.ts` with append and query methods, plus `test/conformance/audit-log.conformance.ts`. Atomic checks: (a) event fields are structured, (b) redaction helper removes PII/secrets, (c) port + conformance harness exist. First in this umbrella; blocks `P08-10b` and `P08-10d`.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/domain/audit-event.ts`, `src/modules/security/domain/audit-redaction.ts`, `src/modules/security/domain/ports/audit-log.port.ts`, `src/modules/security/domain/audit-event.spec.ts`, `test/conformance/audit-log.conformance.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/sec-audit-logging` (shared with `P08-10b`, `P08-10c`, `P08-10d`, `P08-10e`)
- **Commit**: `feat(sec): define structured audit event, redaction and port`
- **Testing**: Unit spec asserts redaction removes password/token/code/email/ip fields and preserves safe metadata; type spec for the port; coverage thresholds pass.

### `P08-10b` — Add the in-memory audit-log adapter
- **Description**: Implement `src/modules/security/adapters/audit-log.memory.adapter.ts` as a production-shaped fallback that stores audit events append-only and supports query by actor/action, passing `audit-log.conformance.ts` unchanged. Assert the adapter never mutates an existing event and never stores raw PII. Atomic checks: (a) memory adapter conforms, (b) append-only semantics, (c) no PII in stored events. Depends on `P08-10a`; blocks `P08-10d`.
- **CLI(s)**: `npm run test:unit -- audit`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/adapters/audit-log.memory.adapter.ts`, `src/modules/security/adapters/audit-log.memory.adapter.spec.ts`
  - **Modified**: `src/modules/security/security.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-audit-logging` (shared with `P08-10a`, `P08-10c`, `P08-10d`, `P08-10e`)
- **Commit**: `feat(sec): add in-memory audit-log adapter`
- **Testing**: Conformance suite asserts append, query-by-actor/action, immutability and empty-result negative path; faker dummy ids only; coverage thresholds pass.

### `P08-10c` — Add the append-only Postgres audit adapter
- **Description**: Implement `src/modules/security/adapters/audit-log.typeorm.adapter.ts` with a TypeORM migration creating an append-only `audit_events` table (indexed on actor/action, no update/delete path in the adapter), passing the identical `audit-log.conformance.ts` suite. Add the migration CI check entry so it applies and reverts on a clean Postgres. Atomic checks: (a) Postgres adapter conforms unchanged, (b) table is append-only at the code level, (c) migration applies/reverts. Depends on `P08-10a`; blocks `P08-10e`.
- **CLI(s)**: `npm run migration:generate -- -n AddAuditEvents`; `npm run migration:run`; `npm run test:unit -- audit`.
- **Package(s)**: `None` — reuses TypeORM and the migration tooling from `P03-01`/`P03-03`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/adapters/audit-log.typeorm.adapter.ts`, `src/modules/security/adapters/audit-log.typeorm.adapter.spec.ts`, `src/migrations/<timestamp>-add-audit-events-table.ts`
  - **Modified**: `src/modules/security/security.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-audit-logging` (shared with `P08-10a`, `P08-10b`, `P08-10d`, `P08-10e`)
- **Commit**: `feat(sec): add append-only Postgres audit-log adapter`
- **Testing**: Same conformance suite passes; assert no UPDATE/DELETE emitted by the adapter via `vi.fn()` repository spy; migration apply + revert on clean Postgres in CI; coverage thresholds pass.

### `P08-10d` — Instrument sensitive events with a single emitter
- **Description**: Add `AuditEmitter` in `src/modules/security/application/` that depends only on `AUDIT_LOG`, builds `AuditEvent`s through the redaction helper and is called from the sensitive paths: login success/failure, password reset, TOTP enroll/toggle, recovery-code use, OTP/magic-link verify, device revoke, lockout and logout/revocation. Do not log raw request bodies or tokens; keep controllers thin. Atomic checks: (a) all listed events emit, (b) redaction applied before append, (c) no business rules in controllers. Depends on `P08-10b`; blocks `P08-10e`.
- **CLI(s)**: `npm run test:unit`; `npm run test:e2e -- audit`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/application/audit.emitter.ts`, `src/modules/security/application/audit.emitter.spec.ts`
  - **Modified**: `src/modules/auth/use-cases/local-login.use-case.ts`, `src/modules/auth/use-cases/reset-password.use-case.ts`, `src/modules/security/application/use-cases/enroll-totp.use-case.ts`, `src/modules/security/application/use-cases/verify-recovery-code.use-case.ts`, `src/modules/security/application/use-cases/verify-otp.use-case.ts`, `src/modules/security/application/use-cases/verify-magic-link.use-case.ts`, `src/modules/security/application/use-cases/revoke-device.use-case.ts`, `src/modules/security/application/use-cases/lockout-guard.service.ts`, `src/modules/auth/use-cases/logout.use-case.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-audit-logging` (shared with `P08-10a`, `P08-10b`, `P08-10c`, `P08-10e`)
- **Commit**: `feat(sec): instrument sensitive events through audit emitter`
- **Testing**: Unit spec with `vi.fn()` audit port asserting one append per event and redaction of injected secret/PII values; negative path where emitter failure does not crash use cases; coverage thresholds pass.

### `P08-10e` — Prove end-to-end emission and PII redaction
- **Description**: Add an E2E suite that triggers a representative subset of flows and asserts the corresponding structured events appear in the audit store with correct `action`/`outcome` and hashed IP/user-agent fields. Add a negative assertion that an unrelated route emits no event and that no raw email, password, token or IP appears in any stored event. Run the conformance suite against both memory and Postgres adapters. Atomic checks: (a) events observable E2E, (b) no PII in any event, (c) both adapters conform. Depends on `P08-10c` and `P08-10d`.
- **CLI(s)**: `npm run test:e2e -- audit`; `npm run test:unit -- audit`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `test/audit.e2e-spec.ts`
  - **Modified**: `src/modules/security/adapters/audit-log.memory.adapter.spec.ts`, `src/modules/security/adapters/audit-log.typeorm.adapter.spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-audit-logging` (shared with `P08-10a`, `P08-10b`, `P08-10c`, `P08-10d`)
- **Commit**: `test(sec): verify audit events end-to-end and PII redaction`
- **Testing**: E2E asserts event presence/absence and hashed fields; log/store scan via `vi.fn()` spy proves no raw PII; conformance suite passes for both adapters; coverage thresholds pass.

### `P08-11a` — Define the versioned-secret model and store port
- **Description**: Create a `VersionedSecret` domain value object (`version`, `value`, `createdAt`, `isActive`) and a `VersionedSecretStore` port + `VERSIONED_SECRET_STORE` token in `src/modules/security/domain/ports/versioned-secret-store.port.ts` with `getActive`, `get(version)`, `rotate(value)` and `retire(version)`. Add `test/conformance/versioned-secret-store.conformance.ts`. Fixtures use faker-generated dummy strings only — no real keys. Atomic checks: (a) versioned model exists, (b) narrow port + conformance harness, (c) no real secret fixtures. First in this umbrella; blocks `P08-11b` and `P08-11d`.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/domain/value-objects/versioned-secret.vo.ts`, `src/modules/security/domain/ports/versioned-secret-store.port.ts`, `src/modules/security/domain/value-objects/versioned-secret.vo.spec.ts`, `test/conformance/versioned-secret-store.conformance.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/crypto-secrets-rotation` (shared with `P08-11b`, `P08-11c`, `P08-11d`, `P08-11e`)
- **Commit**: `feat(crypto): define versioned secret model and store port`
- **Testing**: Unit spec asserts version ordering and active-pointer semantics; type spec for the port; coverage thresholds pass.

### `P08-11b` — Add the in-memory versioned-secret store
- **Description**: Implement `src/modules/security/adapters/versioned-secret-store.memory.adapter.ts` as a production-shaped fallback supporting old+new coexistence, atomic `rotate` and `retire`, and passing `versioned-secret-store.conformance.ts` unchanged. Atomic checks: (a) memory adapter conforms, (b) old and new versions coexist, (c) retire removes access to the old version. Depends on `P08-11a`; blocks `P08-11d`.
- **CLI(s)**: `npm run test:unit -- versioned-secret`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/adapters/versioned-secret-store.memory.adapter.ts`, `src/modules/security/adapters/versioned-secret-store.memory.adapter.spec.ts`
  - **Modified**: `src/modules/security/security.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/crypto-secrets-rotation` (shared with `P08-11a`, `P08-11c`, `P08-11d`, `P08-11e`)
- **Commit**: `feat(crypto): add in-memory versioned secret store`
- **Testing**: Conformance suite asserts getActive returns newest, get(version) returns historical values, rotate is atomic and retire rejects the old version; negative path for unknown version; coverage thresholds pass.

### `P08-11c` — Add the encrypted persistent versioned-secret store
- **Description**: Implement `src/modules/security/adapters/versioned-secret-store.typeorm.adapter.ts` persisting secret values encrypted at rest via the shared `ENCRYPTION_SERVICE` port, with a migration for the versioned-secrets table and passing the identical `versioned-secret-store.conformance.ts` suite. Store no plaintext and no real keys in the migration or fixtures. Atomic checks: (a) persistent adapter conforms unchanged, (b) values encrypted at rest, (c) migration applies/reverts. Depends on `P08-11a`; blocks `P08-11d`.
- **CLI(s)**: `npm run migration:generate -- -n AddVersionedSecrets`; `npm run migration:run`; `npm run test:unit -- versioned-secret`.
- **Package(s)**: `None` — reuses TypeORM from `P03-01` and the shared `ENCRYPTION_SERVICE` port.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/adapters/versioned-secret-store.typeorm.adapter.ts`, `src/modules/security/adapters/versioned-secret-store.typeorm.adapter.spec.ts`, `src/migrations/<timestamp>-add-versioned-secrets-table.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/crypto-secrets-rotation` (shared with `P08-11a`, `P08-11b`, `P08-11d`, `P08-11e`)
- **Commit**: `feat(crypto): add encrypted persistent versioned secret store`
- **Testing**: Same conformance suite passes; assert persisted value is ciphertext and decrypt round-trip; tampered ciphertext rejected; migration apply + revert; coverage thresholds pass.

### `P08-11d` — Wire rotation into JWT and encryption consumers
- **Description**: Add `SecretRotationService` that reads the active secret version by purpose and exposes `getSigningKey()`/`getEncryptionKey()` so the `TOKEN_ISSUER` signs with the new key and `kid` while `JWKS`/verification still accepts the old version until retired. Add a grace-window policy so `rotate` publishes a new version without immediately invalidating existing tokens; `retire` removes the old version after the window. Atomic checks: (a) new tokens use new `kid`, (b) old tokens verify during grace, (c) retired version stops verifying. Depends on `P08-11b`/`P08-11c`.
- **CLI(s)**: `npm run test:unit`; `npm run test:e2e -- rotation`.
- **Package(s)**: `None` — reuses RS256/`kid` config from `P05-03` and `TOKEN_ISSUER` from `P05-04`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/application/secret-rotation.service.ts`, `src/modules/security/application/secret-rotation.service.spec.ts`, `test/secrets-rotation.e2e-spec.ts`
  - **Modified**: `src/modules/auth/adapters/token-issuer.adapter.ts`, `src/common/config/auth.config.ts`, `src/modules/security/security.module.ts`, `src/app.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/crypto-secrets-rotation` (shared with `P08-11a`, `P08-11b`, `P08-11c`, `P08-11e`)
- **Commit**: `feat(crypto): rotate signing and encryption secrets by version`
- **Testing**: Unit spec with `vi.fn()` store and fake timers for the grace window; E2E asserts a token signed pre-rotation verifies after rotation via JWKS with both `kid`s and fails after retire; negative path for retired key; coverage thresholds pass.

### `P08-11e` — Add the rotation CLI, runbook and audit integration
- **Description**: Add a small `scripts/rotate-secret.mjs` CLI (Node built-ins only) that calls the rotation service through its application interface, plus a `docs/secrets-rotation.md` runbook describing rotate → grace → retire steps and the rollback path. Emit an audit event via `AuditEmitter` on each rotate/retire using safe metadata (version number only, never the value). Wire an npm script and add the final conformance/coverage pass. Atomic checks: (a) CLI + runbook exist, (b) audit event emitted without secret values, (c) all adapters conform and coverage met. Depends on `P08-11d` and `P08-10d`.
- **CLI(s)**: `npm pkg set scripts.secrets:rotate="node scripts/rotate-secret.mjs"`; `npm run secrets:rotate -- --help`; `npm run test:unit -- versioned-secret`; `npm run test:cov`.
- **Package(s)**: `None` — Node built-ins only.
- **File(s)/Folder(s)**:
  - **Added**: `scripts/rotate-secret.mjs`, `scripts/rotate-secret.spec.ts`, `docs/secrets-rotation.md`
  - **Modified**: `src/modules/security/application/secret-rotation.service.ts`, `package.json`, `package-lock.json`, `src/modules/security/adapters/versioned-secret-store.memory.adapter.spec.ts`, `src/modules/security/adapters/versioned-secret-store.typeorm.adapter.spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/crypto-secrets-rotation` (shared with `P08-11a`, `P08-11b`, `P08-11c`, `P08-11d`)
- **Commit**: `chore(crypto): add secrets rotation cli, runbook and audit hooks`
- **Testing**: CLI spec with `vi.fn()` on the rotation service; unit spec asserts audit event contains only the version number and no secret value; conformance suite passes for both adapters; final coverage thresholds pass.

## Phase Gate (end of step)

- [ ] Full unit tests + coverage thresholds pass.
- [ ] E2E passes for sensitive-event audit emission with PII redaction and for secret rotation coexistence (old and new `kid`s valid during grace, retired key rejected).
- [ ] Conformance specs pass for the AuditLog and VersionedSecretStore ports across all adapters, including in-memory fallbacks; audit events are structured and PII-free; secrets are versioned and encrypted at rest; no real secrets committed.
- [ ] Security audit & version sync pass; lint/format/typecheck clean.
- [ ] Each atomic commit pushed on its shared branch; PR merged into `dev` in this exact order:
  `P08-10a` → `P08-10b` → `P08-10c` → `P08-10d` → `P08-10e` → `P08-11a` → `P08-11b` → `P08-11c` → `P08-11d` → `P08-11e`.
- [ ] Status for umbrella IDs `P08-10`, `P08-11` set to `✅ Done` in [`roadmap.md`](../../../roadmap.md) §4 (atomic IDs tracked here).
- [ ] Re-check the P08 exit criterion in [`roadmap.md`](../../../roadmap.md) §6.1 before starting the next step.
