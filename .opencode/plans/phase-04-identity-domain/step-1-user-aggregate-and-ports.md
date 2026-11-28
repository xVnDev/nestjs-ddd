# P04 · Step 1 — User Aggregate & Ports

**Project:** nestjs-ddd  |  **Phase:** P04 — Identity Domain  |  **Base branch:** `dev`  |  **Status:** ✅ Done

> Source of truth: [`roadmap.md`](../../../roadmap.md) §4. Umbrella IDs `P04-01`, `P04-02`, `P04-03` stay in the roadmap; this file lists the final atomic split (`P04-01a` … `P04-03d`).
> **Format**: `P<phase>-<umbrella><letter>` — one atomic task = one commit; sibling atomic tasks share one branch (branch per umbrella task). Every atomic task uses the 7-field format: `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing`.
> **Ordering notes**: (a) `P02-02` already defines the cross-context `PASSWORD_HASHER` token/interface and `P02-03` the conformance harness — this step adds only adapters and runs the shared spec, it does not redefine the port. (b) `P04-01a` → `P04-01b` → `P04-01c` build the aggregate bottom-up (value object → entity → invariant service); `P04-02*` and `P04-03*` may start only after `P04-01b` fixes the `Sub` type those adapters persist. (c) `P04-03a` places the `USER_REPOSITORY` port in the shared kernel because user, admin and auth contexts all rebind it; `P04-03b`/`P04-03c` add its two adapters and `P04-03d` binds the token, so the conformance spec in `P04-03c` runs against both adapters.

## DDD + SOLID lens for this step

- Bounded contexts own `domain/`, `application/`, `infrastructure/`, `interfaces/`; dependencies point inward.
- Domain/application depend only on port tokens; adapters are injected, never imported directly.
- Every port ships one conformance spec run against all adapters, including in-memory fallbacks.
- Business rules live in entities/value objects/use cases; controllers stay thin.
- Introduce a port only when a mechanism must be swappable or isolated for tests.
- The `domain/` layer stays framework-free: `Sub` and `User` import neither Nest, TypeORM nor Argon2.
- Ports introduced here live in `src/modules/shared/ports/`; contexts only rebind the token to a concrete adapter.

## Step Summary

Model the identity domain bottom-up: a `Sub` value object that unifies local and federated identities, a `User` aggregate that enforces the no-duplicate-`sub` invariant, an Argon2id hasher behind the existing `PASSWORD_HASHER` port with a conforming in-memory fallback, and a `USER_REPOSITORY` port with TypeORM + in-memory adapters sharing one conformance spec.

## Atomic Tasks

### `P04-01a` — Define the Sub identity value object
- **Description**: Create `src/modules/user/domain/value-objects/sub.vo.ts` with an immutable `Sub` value object holding a stable identifier that links one local account to any future federated identities. Validate in the constructor (trimmed, non-empty, bounded length, allowed charset) and expose `equals()` / `toString()`, plus factories `Sub.fromLocal(userId)` and `Sub.fromFederated(provider, subject)` so both identity sources produce the same comparable shape. Add a unit spec covering equality, invalid-input rejection and local-vs-federated equivalence. This is the prerequisite for `P04-01b` (the aggregate stores a `Sub`) and must land first. Atomic checks: (a) value object is immutable and framework-free, (b) malformed values throw a domain error, (c) two construction paths for the same identity yield equal values.
- **CLI(s)**: `mkdir -p src/modules/user/domain/value-objects`; `npm run test:unit -- sub.vo`; `npm run typecheck`.
- **Package(s)**: `None` — pure TypeScript domain value object, no new dependency.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/user/domain/value-objects/sub.vo.ts`, `src/modules/user/domain/value-objects/sub.vo.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/user-aggregate-sub` (shared with `P04-01b`, `P04-01c`)
- **Commit**: `feat(user): add Sub identity value object for local and federated ids`
- **Testing**: `sub.vo.spec.ts` asserts `equals()` symmetry, rejection of empty/oversized/malformed values via a domain error, and that `fromLocal()`/`fromFederated()` produce equal `Sub` values for one logical identity. Use seeded faker fixtures for valid values; coverage thresholds stay green.

### `P04-01b` — Model the User aggregate root
- **Description**: Create `src/modules/user/domain/entities/user.entity.ts` defining the `User` aggregate root with `id`, a `Sub` (not a raw string), normalised `email`, an optional password hash, status flags and timestamps. Constructor and named factories enforce invariants: a `Sub` is mandatory and unique per aggregate, a local user must carry a password hash, and a federated-only user must not. Add mutation methods `changeEmail`, `setPasswordHash`, `activate` / `deactivate` in `src/modules/user/domain/entities/user.entity.ts` that emit typed events from `src/modules/user/domain/events/user.events.ts` and keep every rule inside the entity. Depends on `P04-01a` for `Sub`; `P04-01c` supplies the full cross-user invariant service. Atomic checks: (a) aggregate stores a `Sub`, (b) local/federated constraints enforced in the entity, (c) mutations emit domain events.
- **CLI(s)**: `mkdir -p src/modules/user/domain/entities src/modules/user/domain/events`; `npm run test:unit -- user.entity`; `npm run typecheck`.
- **Package(s)**: `None` — framework-free domain; reuses the base entity from `P02-04`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/user/domain/entities/user.entity.ts`, `src/modules/user/domain/entities/user.entity.spec.ts`, `src/modules/user/domain/events/user.events.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/user-aggregate-sub` (shared)
- **Commit**: `feat(user): model User aggregate with sub identity value object`
- **Testing**: `user.entity.spec.ts` asserts all invariants (missing/duplicate `Sub` rejected, local requires hash, federated rejects hash), email normalisation, and that each mutation emits the matching event from `user.events.ts`. The `P02-06` architecture guard test must show no Nest/TypeORM import in `domain/`.

### `P04-01c` — Add the cross-user uniqueness invariant service and consolidate specs
- **Description**: Add `src/modules/user/domain/services/user-uniqueness.service.ts`, a pure domain service expressing "no two users share one `Sub`" and "one email per local account" as predicates over a collection of users, so the rules are testable without persistence. Consolidate the `P04-01a`/`P04-01b` specs with table-driven faker fixtures, including the federated-then-local merge case where two identity sources must resolve to one user. Refines `P04-01b`; `P04-03a`'s repository port will call this service before persisting. Atomic checks: (a) service is pure and framework-free, (b) merge case covered, (c) all `P04-01*` specs green with coverage.
- **CLI(s)**: `mkdir -p src/modules/user/domain/services`; `npm run test:unit -- user-uniqueness`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/user/domain/services/user-uniqueness.service.ts`, `src/modules/user/domain/services/user-uniqueness.service.spec.ts`
  - **Modified**: `src/modules/user/domain/entities/user.entity.spec.ts`, `src/modules/user/domain/value-objects/sub.vo.spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/user-aggregate-sub` (shared)
- **Commit**: `test(user): add no-duplicate-sub domain invariant service and specs`
- **Testing**: `user-uniqueness.service.spec.ts` asserts rejection of duplicate-`Sub` and duplicate-email sets using `vi.fn()`-free pure calls; the merge case asserts one `User` results from both identity sources. `npm run test:cov` keeps thresholds; no E2E in this task (pure domain).

### `P04-02a` — Add the Argon2id PASSWORD_HASHER adapter
- **Description**: Implement `src/modules/user/infrastructure/adapters/argon2-password-hasher.adapter.ts` satisfying the `PASSWORD_HASHER` port defined in `P02-02`, with `hash(plain)`, `verify(hash, plain)` and `needsRehash(hash)`. Use the `argon2` package with Argon2id and memory/time/parallelism read from typed auth config (`src/common/config/auth.config.ts`, value from `P01`/`P05-03`), never hard-coded secrets; return a PHC string and never log plaintext. Keep the class thin — no user lookup, no business rules — so it is replaceable by token rebind. Placement uses the `User` type from `P04-01b`; `P04-02b` adds the fallback and `P04-02c` the shared conformance spec. Atomic checks: (a) implements the `P02-02` port exactly, (b) hash verifies and `needsRehash` detects parameter drift, (c) no plaintext in logs or errors.
- **CLI(s)**: `npm install argon2`; `mkdir -p src/modules/user/infrastructure/adapters`; `npm run test:unit -- argon2-password-hasher`; `npm run typecheck`.
- **Package(s)**: `argon2` installed with `npm install argon2` (native Argon2id implementation). The `PASSWORD_HASHER` token/interface is reused from `P02-02`; no new port declared.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/user/infrastructure/adapters/argon2-password-hasher.adapter.ts`, `src/modules/user/infrastructure/adapters/argon2-password-hasher.adapter.spec.ts`
  - **Modified**: `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `feat/user-argon2id-adapter` (shared with `P04-02b`, `P04-02c`)
- **Commit**: `feat(user): add Argon2id password hasher adapter`
- **Testing**: `argon2-password-hasher.adapter.spec.ts` asserts a generated hash verifies with the correct password, rejects a wrong password, and `needsRehash()` flips when mocked config params change (`vi.fn()` on the config provider). Assert no plaintext appears in logger spies. Coverage thresholds pass.

### `P04-02b` — Add the deterministic in-memory password hasher fallback
- **Description**: Add `src/modules/user/infrastructure/adapters/memory-password-hasher.adapter.ts` implementing the same `PASSWORD_HASHER` port as a production-shaped fallback: store a salted digest keyed by a seeded faker value so local dev and E2E need no native module, while still exposing `hash`, `verify` and `needsRehash`. It must obey the identical observable contract (PHC-shaped string, wrong-password rejection, rehash flag) so the conformance spec in `P04-02c` passes unchanged against it. Bind it in `UserModule` only for non-production environments. Atomic checks: (a) implements the same port, (b) deterministic digest for a given salt/seed, (c) selected by an env-driven DI binding.
- **CLI(s)**: `npm run test:unit -- memory-password-hasher`; `npm run typecheck`.
- **Package(s)**: `None` — Node `crypto` built-ins only; no new dependency.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/user/infrastructure/adapters/memory-password-hasher.adapter.ts`, `src/modules/user/infrastructure/adapters/memory-password-hasher.adapter.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/user-argon2id-adapter` (shared)
- **Commit**: `feat(user): add in-memory password hasher fallback adapter`
- **Testing**: `memory-password-hasher.adapter.spec.ts` asserts deterministic output for a fixed seed, correct/wrong-password behaviour and `needsRehash()` semantics; the full contract is proven by the conformance spec in `P04-02c`. Coverage thresholds pass.

### `P04-02c` — Add the PASSWORD_HASHER conformance spec across all adapters
- **Description**: Create `src/modules/shared/ports/conformance/password-hasher.conformance-spec.ts` using the harness from `P02-03`: one spec parameterised over adapter factories for the Argon2id adapter (`P04-02a`) and the memory fallback (`P04-02b`). Assert identical behaviour for every adapter — hash format, verify success/failure, `needsRehash` semantics, no plaintext leakage — so a new hasher is accepted only when this spec passes unchanged. Bind the default `PASSWORD_HASHER` token in `src/modules/user/user.module.ts` via an env-driven factory (production → Argon2id, otherwise memory). Depends on both `P04-02a` and `P04-02b`. Atomic checks: (a) one spec run against two adapters, (b) memory fallback conforms unchanged, (c) token bound via DI factory.
- **CLI(s)**: `npm run test:unit -- password-hasher.conformance`; `npm run test:cov`.
- **Package(s)**: `None` — reuses the `P02-03` conformance harness and the `P02-02` token.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/ports/conformance/password-hasher.conformance-spec.ts`
  - **Modified**: `src/modules/user/user.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/user-argon2id-adapter` (shared)
- **Commit**: `test(user): add PASSWORD_HASHER conformance spec for all adapters`
- **Testing**: `password-hasher.conformance-spec.ts` uses `describe.each` over both adapter factories with shared cases; mock config via `vi.fn()`. Coverage thresholds pass; the downstream local strategy in `P05-01b` consumes this bound token.

### `P04-03a` — Define the USER_REPOSITORY port in the shared kernel
- **Description**: Add `src/modules/shared/ports/user-repository.port.ts` declaring the `USER_REPOSITORY` DI token and a narrow interface with the operations the contexts actually need: `save`, `findById`, `findBySub` (from `P04-01a`), `findByEmail`, `findAll` (paged) and `softDelete`. Keep the interface free of TypeORM types and accept/return the `User` aggregate from `P04-01b`. Document that user, admin and auth contexts rebind this token, so no context redefines the port. Depends on `P04-01b` for the `User` type. Atomic checks: (a) single token in shared kernel, (b) no infrastructure imports in the port, (c) method set matches the stated consumers.
- **CLI(s)**: `mkdir -p src/modules/shared/ports`; `npm run test:unit -- user-repository.port`; `npm run typecheck`.
- **Package(s)**: `None` — TypeScript interface plus a Nest DI token symbol.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/ports/user-repository.port.ts`, `src/modules/shared/ports/user-repository.port.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/user-repository-port` (shared with `P04-03b`, `P04-03c`, `P04-03d`)
- **Commit**: `feat(user): define USER_REPOSITORY port in the shared kernel`
- **Testing**: `user-repository.port.spec.ts` is a type-level/mock spec: build a `vi.fn()`-backed fake implementing the interface and assert the method signatures compile; the `P02-06` architecture guard proves the port imports no persistence library.

### `P04-03b` — Add the TypeORM user repository adapter
- **Description**: Implement `src/modules/user/infrastructure/adapters/typeorm-user-repository.adapter.ts` against `USER_REPOSITORY` from `P04-03a`, using the soft-delete base entity from `P03-02` and an ORM entity at `src/modules/user/infrastructure/persistence/user.orm-entity.ts`. Map rows ↔ `User` aggregate in one place, call the `P04-01c` uniqueness service before `save`, and make `softDelete` set the deletion timestamp rather than issuing a physical delete. Keep SQL/ORM details entirely inside the adapter. Depends on `P04-03a` (port) and `P04-01b`/`P04-01c` (aggregate + invariant). Atomic checks: (a) implements every port method, (b) soft delete is non-physical, (c) uniqueness checked before persist.
- **CLI(s)**: `mkdir -p src/modules/user/infrastructure/persistence`; `npm run test:unit -- typeorm-user-repository`; `npm run typecheck`.
- **Package(s)**: `None` new here — reuses TypeORM packages installed by `P03-01`/`P03-02`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/user/infrastructure/adapters/typeorm-user-repository.adapter.ts`, `src/modules/user/infrastructure/adapters/typeorm-user-repository.adapter.spec.ts`, `src/modules/user/infrastructure/persistence/user.orm-entity.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/user-repository-port` (shared)
- **Commit**: `feat(user): add TypeORM user repository adapter with soft delete`
- **Testing**: `typeorm-user-repository.adapter.spec.ts` mocks the TypeORM repository with `vi.fn()` and asserts row↔aggregate mapping, that `save` consults the uniqueness service, and that `softDelete` sets a timestamp without calling `delete()`. Migration check from `P03-03` still passes.

### `P04-03c` — Add the in-memory repository fallback and shared conformance spec
- **Description**: Add `src/modules/user/infrastructure/adapters/memory-user-repository.adapter.ts` implementing `USER_REPOSITORY` with a Map-based, production-shaped fallback (supports paging and soft-delete filtering identically to the TypeORM adapter). Then create `src/modules/shared/ports/conformance/user-repository.conformance-spec.ts` using the `P02-03` harness over both the TypeORM (`P04-03b`) and memory adapters, asserting CRUD, `findBySub`, `findByEmail`, paging and soft-delete behaviour are identical. A new repository adapter is accepted only when this spec passes unchanged. Depends on `P04-03a` and `P04-03b`. Atomic checks: (a) memory adapter conforms, (b) one spec across both adapters, (c) soft-delete semantics identical.
- **CLI(s)**: `npm run test:unit -- user-repository.conformance`; `npm run test:cov`.
- **Package(s)**: `None` — reuses the `P02-03` harness; memory fallback uses built-in `Map`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/user/infrastructure/adapters/memory-user-repository.adapter.ts`, `src/modules/user/infrastructure/adapters/memory-user-repository.adapter.spec.ts`, `src/modules/shared/ports/conformance/user-repository.conformance-spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/user-repository-port` (shared)
- **Commit**: `test(user): add USER_REPOSITORY conformance spec for both adapters`
- **Testing**: `user-repository.conformance-spec.ts` runs `describe.each` over both adapter factories; TypeORM side uses `vi.fn()`-mocked ORM, memory side runs real. Assert identical results for CRUD/query/soft-delete; coverage thresholds pass.

### `P04-03d` — Bind USER_REPOSITORY in UserModule and wire the migration check
- **Description**: In `src/modules/user/user.module.ts`, bind `USER_REPOSITORY` to the TypeORM adapter in production and to the memory fallback otherwise, following the same env-driven pattern as `P04-02c`, and export the token for the admin and auth contexts to rebind later. Add the `users` table definition to the existing TypeORM migration (from `P03-03`) and verify apply + revert on clean Postgres in CI. This is the final task of the umbrella and gates the admin CRUD in step 2. Atomic checks: (a) token bound via DI factory, (b) migration applies and reverts, (c) no adapter imported by domain/application layers.
- **CLI(s)**: `npm run migration:generate -- -n AddUsersTable`; `npm run migration:run`; `npm run migration:revert`; `npm run test:e2e -- user-repository`.
- **Package(s)**: `None` — reuses TypeORM tooling from `P03-01`/`P03-03`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/user/infrastructure/persistence/migrations/<timestamp>-AddUsersTable.ts`
  - **Modified**: `src/modules/user/user.module.ts`, `src/common/config/typeorm.config.ts` (entity registration)
  - **Deleted**: `None`
- **Branch**: `feat/user-repository-port` (shared)
- **Commit**: `feat(user): bind USER_REPOSITORY token and add users migration`
- **Testing**: E2E `test/user-repository.e2e-spec.ts` resolves the bound token in a real Nest app and performs one save/find/soft-delete round trip through both env modes; migration CI check passes; architecture guard still forbids adapter imports in inner layers.

## Phase Gate (end of step)

- [x] Full unit tests + coverage thresholds pass, including the `PASSWORD_HASHER` and `USER_REPOSITORY` conformance specs against **all** adapters (Argon2id + memory hasher; TypeORM + memory repository).
- [x] Migration applies and reverts on clean Postgres; E2E passes for both env bindings.
- [x] Architecture guard (`P02-06`) confirms `domain/` stays framework-free and inner layers import only port tokens.
- [x] Lint / format / typecheck clean; security audit & version sync pass.
- [x] Each atomic commit pushed on its shared branch; PR merged into `dev` in this exact order:
  `P04-01a` → `P04-01b` → `P04-01c` → `P04-02a` → `P04-02b` → `P04-02c` → `P04-03a` → `P04-03b` → `P04-03c` → `P04-03d`.
- [x] Status for umbrella IDs `P04-01`, `P04-02`, `P04-03` set to `✅ Done` in [`roadmap.md`](../../../roadmap.md) §4 (atomic IDs tracked here).
- [x] Re-check the P04 exit criterion in [`roadmap.md`](../../../roadmap.md) §6.1 before starting the next step.
