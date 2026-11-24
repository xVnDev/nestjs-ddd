# P07 · Step 1 — Registration & Login APIs

**Project:** nestjs-ddd  |  **Phase:** P07 — End-user Auth APIs  |  **Base branch:** `dev`  |  **Status:** ⬜ Planned

> Source of truth: [`roadmap.md`](../../../roadmap.md) §4. Umbrella IDs `P07-01`, `P07-02` stay in the roadmap; this file lists the final atomic split (`P07-01a` … `P07-02c`).
> **Format**: `P<phase>-<umbrella><letter>` — one atomic task = one commit; sibling atomic tasks share one branch (branch per umbrella task). Every atomic task uses the 7-field format: `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing`.
> **Branch model**: `P07-01a` … `P07-01c` share `feat/auth-register-api`; `P07-02a` … `P07-02c` share `feat/auth-login-mail-hook`, each cut from `dev` and merged back in Phase Gate order.
> **Ordering notes**: (a) registration (`P07-01`) merges before login (`P07-02`) because login's verification-mail hook targets users created by registration. (b) `P07-01a` defines the DTO contract first, `P07-01b` implements the use case behind ports, `P07-01c` adds the thin controller — business rules never enter the controller. (c) The verification mail side effect in `P07-02b` goes through the queue port (`P03-06`/`P03-07`), never a direct mail send. (d) Token issuance uses `TOKEN_ISSUER` from `P05-04`; no secrets or PII are logged or committed.

## DDD + SOLID lens for this step

- Bounded contexts own `domain/`, `application/`, `infrastructure/`, `interfaces/`; dependencies point inward.
- Domain/application depend only on port tokens; adapters are injected, never imported directly.
- Every port ships one conformance spec run against all adapters, including in-memory fallbacks.
- Business rules live in entities/value objects/use cases; controllers stay thin.
- Introduce a port only when a mechanism must be swappable or isolated for tests.

## Step Summary

Expose end-user registration and login APIs as thin HTTP edges over use cases. Registration hashes the password via `PASSWORD_HASHER` and creates a local user while rejecting duplicate emails. Login issues tokens via `TOKEN_ISSUER` and enqueues a verification-mail job through the queue port — all side effects asynchronous and port-based, with unverified-email and duplicate-email negative paths covered end-to-end.

## Atomic Tasks

### `P07-01a` — Add the registration DTO and email uniqueness contract
- **Description**: Add `RegisterUserDto` in `src/modules/auth/interfaces/dto/` with `class-validator` rules for a valid email and a password meeting the configured policy (length/complexity read from config, never hard-coded). Add a typed result contract for the use case (`created`/`duplicateEmail`) so the controller can translate it to HTTP without business logic. The DTO is the only transport-level validation; the use case owns the duplicate-email rule. Atomic checks: (a) DTO validates email and password, (b) result contract typed, (c) no business rule in the DTO beyond shape validation.
- **CLI(s)**: `mkdir -p src/modules/auth/interfaces/dto`; `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `class-validator`/`class-transformer` from `P01-05` and the global `ValidationPipe`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/interfaces/dto/register-user.dto.ts`, `src/modules/auth/interfaces/dto/register-user.dto.spec.ts`, `src/modules/auth/use-cases/register-user.result.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/auth-register-api` (shared with `P07-01b`, `P07-01c`)
- **Commit**: `feat(auth): add registration dto and use-case result contract`
- **Testing**: Unit spec with `class-validator`'s `validateSync` asserts a valid payload passes, malformed email and short password fail, and unknown fields are rejected by the global whitelist; coverage thresholds pass.

### `P07-01b` — Implement the RegisterUser use case
- **Description**: Add `RegisterUserUseCase` in `src/modules/auth/use-cases/` that checks the user repository port for an existing email (normalised lowercase) and returns `duplicateEmail` without creating a row if found; otherwise hashes the password via `PASSWORD_HASHER` and creates a local user keyed by a generated `sub` via `ID_GENERATOR`. All I/O goes through ports mocked with `vi.fn()`. The use case contains the duplicate-email business rule; it does not send mail or issue tokens. Depends on `P07-01a`. Atomic checks: (a) duplicate email returns `duplicateEmail` and writes nothing, (b) happy path hashes then creates one user, (c) no direct adapter import.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `PASSWORD_HASHER`, user repository port and `ID_GENERATOR` from `P02`/`P04`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/use-cases/register-user.use-case.ts`, `src/modules/auth/use-cases/register-user.use-case.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/auth-register-api` (shared)
- **Commit**: `feat(auth): implement register user use case with duplicate-email guard`
- **Testing**: Use-case unit spec with `vi.fn()` mocks asserts: duplicate email → `duplicateEmail` result, zero hash/create calls; happy path → one hash call, one create call with a generated `sub` and lowercase email; negative spec asserts a repository error propagates. Coverage thresholds pass.

### `P07-01c` — Add the thin register controller and cover the API end-to-end
- **Description**: Add `AuthRegisterController` with `POST /auth/register` that validates `RegisterUserDto`, calls `RegisterUserUseCase` and maps `duplicateEmail` to `409 Conflict` and `created` to `201 Created`, returning no password or PII in the response. Wire the use case and ports into `auth.module.ts`. Add E2E covering happy path, duplicate email (`409`) and malformed payload (`400`). Atomic checks: (a) controller has no business logic, (b) 201/409/400 mapping correct, (c) response contains no password.
- **CLI(s)**: `mkdir -p src/modules/auth/interfaces/controllers`; `npm run test:e2e -- register`; `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `@nestjs/common` and ports from earlier phases.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/interfaces/controllers/auth-register.controller.ts`, `src/modules/auth/interfaces/controllers/auth-register.controller.spec.ts`, `test/auth-register.e2e-spec.ts`
  - **Modified**: `src/modules/auth/auth.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-register-api` (shared)
- **Commit**: `feat(auth): add thin register controller and e2e coverage`
- **Testing**: E2E with faker fixtures asserts 201 on valid registration, 409 on duplicate email, 400 on malformed payload, and that the response body has no `password` field; the in-memory repository contains exactly one user after the happy path. Coverage thresholds pass.

### `P07-02a` — Add the login DTO and unverified-user signalling
- **Description**: Add `LoginDto` with validated `email` and `password` fields and a typed login result (`tokens` / `unverified` / `invalidCredentials`). Extend the local strategy (`P05-01`) so a successful credential check still reports whether the user's email is verified, without itself deciding what to do about it — that decision belongs to the login use case. Atomic checks: (a) DTO validates email/password, (b) result contract typed, (c) strategy exposes verified flag without business logic.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `class-validator` and the local Passport strategy from `P05-01`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/use-cases/login.result.ts`
  - **Modified**: `src/modules/auth/strategies/local.strategy.ts`, `src/modules/auth/strategies/local.strategy.spec.ts`, `src/modules/auth/interfaces/dto/login.dto.ts`, `src/modules/auth/interfaces/dto/login.dto.spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-login-mail-hook` (shared with `P07-02b`, `P07-02c`)
- **Commit**: `feat(auth): add login dto and unverified-user signalling`
- **Testing**: DTO unit spec asserts validation of email/password; strategy spec with `vi.fn()` mocks asserts the verified flag is forwarded from the user record and no send/issue decision is made in the strategy; coverage thresholds pass.

### `P07-02b` — Implement login with token issuance and queued verification mail
- **Description**: Add `LoginUseCase` in `src/modules/auth/use-cases/` that verifies credentials via the `PASSWORD_HASHER` port, returns `invalidCredentials` generically on failure (no user enumeration), issues an access/refresh token pair via `TOKEN_ISSUER` (`P05-04`), and enqueues a verification-mail job through the queue port (`P03-06`/`P03-07`) when the email is unverified. The mail side effect is a queue `produce` call via the port — never a direct mail transport call — and the use case must not await delivery. Depends on `P07-02a`. Atomic checks: (a) tokens issued via port, (b) verification mail enqueued only when unverified, (c) failures do not reveal whether the email exists.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `PASSWORD_HASHER`, `TOKEN_ISSUER` and the queue port; all mocked with `vi.fn()`.
- **File(s)/Folder(s)**:
  - **Added**: None
  - **Modified**: `None`, `src/modules/auth/use-cases/login.use-case.ts`, `src/modules/auth/use-cases/login.use-case.spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-login-mail-hook` (shared)
- **Commit**: `feat(auth): implement login with token issuance and queued verification mail`
- **Testing**: Use-case unit spec with `vi.fn()` mocks asserts: valid verified user → one `TOKEN_ISSUER` call and zero queue calls; unverified user → one queue `produce` call with the correct job name and user id, no PII in payload; invalid credentials → generic result and zero token/queue calls. Coverage thresholds pass.

### `P07-02c` — Add the thin login controller and cover the API end-to-end
- **Description**: Add `AuthLoginController` with `POST /auth/login` that validates `LoginDto`, calls `LoginUseCase` and returns `200` with the token pair, mapping `invalidCredentials` to `401 Unauthorized` and `unverified` to `202 Accepted` (tokens issued, verification pending). Wire the use case and ports into `auth.module.ts`. Add E2E covering happy path, unverified email and invalid credentials, asserting the mail-queue port received a job. Atomic checks: (a) controller has no business logic, (b) 200/202/401 mapping correct, (c) mail-queue assertion present.
- **CLI(s)**: `npm run test:e2e -- login`; `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/interfaces/controllers/auth-login.controller.ts`, `src/modules/auth/interfaces/controllers/auth-login.controller.spec.ts`
  - **Modified**: `src/modules/auth/auth.module.ts`, `test/auth-login.e2e-spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-login-mail-hook` (shared)
- **Commit**: `feat(auth): add thin login controller and e2e mail-queue assertions`
- **Testing**: E2E with faker fixtures asserts 200 + tokens for a verified user, 202 + one queued verification mail for an unverified user, and 401 for invalid credentials with no enumeration hint; the in-memory queue is inspected to confirm exactly one job. Coverage thresholds pass.

## Phase Gate (end of step)

- [ ] Full unit tests + coverage thresholds pass.
- [ ] E2E passes for register (201/409/400) and login (200/202/401), including the mail-queue side effect.
- [ ] Negative paths covered: unverified email, duplicate email, invalid credentials (no enumeration).
- [ ] Controllers stay thin; all business rules live in use cases; mail side effects go through the queue port.
- [ ] Security audit & version sync pass; no secrets or PII committed.
- [ ] Each atomic commit pushed on its shared branch; PR merged into `dev` in this exact order:
  `P07-01a` → `P07-01b` → `P07-01c` → `P07-02a` → `P07-02b` → `P07-02c`.
- [ ] Status for umbrella IDs `P07-01`, `P07-02` set to `✅ Done` in [`roadmap.md`](../../../roadmap.md) §4 (atomic IDs tracked here).
- [ ] Re-check the P07 exit criterion in [`roadmap.md`](../../../roadmap.md) §6.1 before starting the next step.
