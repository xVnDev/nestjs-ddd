# P02 · Step 1 — Context Layout, Ports & Conformance

**Project:** nestjs-ddd  |  **Phase:** P02 — DDD/SOLID Skeleton  |  **Base branch:** `dev`  |  **Status:** ⬜ Planned

> Source of truth: [`roadmap.md`](../../../roadmap.md) §4. Umbrella IDs `P02-01`, `P02-02`, `P02-03` stay in the roadmap; this file lists the final atomic split (`P02-01a` … `P02-03c`).
> **Format**: `P<phase>-<umbrella><letter>` — one atomic task = one commit; sibling atomic tasks share one branch (branch per umbrella task). Every atomic task uses the 7-field format: `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing`.
> **Ordering notes**: (a) `P02-01a` creates the folder skeleton first; `P02-01b` adds the shared kernel barrel, `P02-01c` registers empty module shells in `app.module.ts`, and `P02-01d` asserts the resulting layout. (b) `P02-02a` (token registry) must land before `P02-02b`–`P02-02d` (port interfaces import those tokens); `P02-02e` adds the barrel and purity conformance last. (c) `P02-03a` (harness core) precedes `P02-03b` (self-test) and `P02-03c` (one spec per port); this step creates test scaffolding only — production adapters and their memory fallbacks are registered in P03–P05 without editing the specs. (d) The conformance harness and the architecture guard from step 2 are the enforcement mechanisms for §5.1/§5.2; both must be green before the P02 exit criterion is checked.

## DDD + SOLID lens for this step

- Bounded contexts own `domain/`, `application/`, `infrastructure/`, `interfaces/`; dependencies point inward.
- Domain/application depend only on port tokens; adapters are injected, never imported directly.
- Every port ships one conformance spec run against all adapters, including in-memory fallbacks.
- Business rules live in entities/value objects/use cases; controllers stay thin.
- Introduce a port only when a mechanism must be swappable or isolated for tests.

## Step Summary

Establish the `src/modules/<context>/{domain,application,infrastructure,interfaces}` layout for all five business contexts plus the `src/modules/shared/` kernel with a domain-free `src/common/`. Define eight narrow port interfaces with unique DI tokens in `src/modules/shared/ports/`, keeping the port layer free of framework imports. Add a reusable `definePortConformance()` harness with a self-test and one conformance spec per port, so every future adapter (including the in-memory fallbacks) is accepted only by passing the same unchanged spec.

## Atomic Tasks

### `P02-01a` — Create the bounded-context layer folder skeleton
- **Description**: Create the four layer folders under each of the five business contexts — `user`, `auth`, `mail`, `security`, `alerts` — giving `src/modules/<context>/{domain,application,infrastructure,interfaces}`. Add a `.gitkeep` file to every empty folder so the structure is tracked by git before any code lands. Do not add Nest modules, classes, barrels or imports in this task; it is purely the filesystem skeleton that later atomics fill. Atomic checks: (a) all 5 × 4 = 20 layer folders exist, (b) every folder carries a tracked `.gitkeep`, (c) no `.ts` source file is added here. This is the prerequisite for `P02-01b`–`P02-01d`.
- **CLI(s)**: `mkdir -p src/modules/{user,auth,mail,security,alerts}/{domain,application,infrastructure,interfaces}`; `touch src/modules/{user,auth,mail,security,alerts}/{domain,application,infrastructure,interfaces}/.gitkeep`; `git status --short`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/user/domain/.gitkeep`, `src/modules/user/application/.gitkeep`, `src/modules/user/infrastructure/.gitkeep`, `src/modules/user/interfaces/.gitkeep`, `src/modules/auth/domain/.gitkeep`, `src/modules/auth/application/.gitkeep`, `src/modules/auth/infrastructure/.gitkeep`, `src/modules/auth/interfaces/.gitkeep`, `src/modules/mail/domain/.gitkeep`, `src/modules/mail/application/.gitkeep`, `src/modules/mail/infrastructure/.gitkeep`, `src/modules/mail/interfaces/.gitkeep`, `src/modules/security/domain/.gitkeep`, `src/modules/security/application/.gitkeep`, `src/modules/security/infrastructure/.gitkeep`, `src/modules/security/interfaces/.gitkeep`, `src/modules/alerts/domain/.gitkeep`, `src/modules/alerts/application/.gitkeep`, `src/modules/alerts/infrastructure/.gitkeep`, `src/modules/alerts/interfaces/.gitkeep`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/arch-context-layout` (shared with `P02-01b` … `P02-01d`)
- **Commit**: `feat(arch): create bounded-context layer folder skeleton`
- **Testing**: No unit test for empty folders here; the folder-structure assertion is added in `P02-01d`. `npm run typecheck` proves no broken imports; the Phase Gate verifies all 20 folders exist.

### `P02-01b` — Create the shared kernel and its public barrel
- **Description**: Create `src/modules/shared/` with the same four layer folders plus `ports/` and `adapters/` subfolders, each with a `.gitkeep` until populated. Add `src/modules/shared/index.ts` as the single public barrel that re-exports only cross-context port tokens and default adapters; context domain internals must never be reachable through it. Leave the re-export list empty in this task — `P02-02e` fills it once tokens and port interfaces exist. Atomic checks: (a) shared kernel has the 4 layer folders plus `ports/` and `adapters/`, (b) the barrel exports only token/adapter symbols and no deep `domain/**` path, (c) `src/common/` remains domain-free. Depends on `P02-01a`'s folder convention.
- **CLI(s)**: `mkdir -p src/modules/shared/{domain,application,infrastructure,interfaces,ports,adapters}`; `touch src/modules/shared/{domain,application,infrastructure,interfaces,ports,adapters}/.gitkeep`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/index.ts`, `src/modules/shared/domain/.gitkeep`, `src/modules/shared/application/.gitkeep`, `src/modules/shared/infrastructure/.gitkeep`, `src/modules/shared/interfaces/.gitkeep`, `src/modules/shared/ports/.gitkeep`, `src/modules/shared/adapters/.gitkeep`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/arch-context-layout` (shared)
- **Commit**: `feat(arch): add shared kernel folders and public barrel`
- **Testing**: Barrel resolution is asserted in `P02-02e` (`test/architecture/port-conformance.spec.ts`) once tokens land; `npm run typecheck` is the only check in this task. No secrets or PII involved.

### `P02-01c` — Add empty Nest module shells and register them
- **Description**: Add one thin NestJS module per context at `src/modules/<context>/<context>.module.ts` (e.g. `user.module.ts`) with an empty `@Module({})` declaration — no controllers, providers or cross-context imports yet. Register all five shells in the `imports` array of `src/app.module.ts` so the bootable app mounts every context from day one. Keep each module at the root of its context as the composition root, not inside a layer folder. Atomic checks: (a) five module shells exist, (b) `app.module.ts` imports all five, (c) the app still boots and responds. Depends on `P02-01a`.
- **CLI(s)**: `npm run test:e2e -- context-layout`; `npm run typecheck`.
- **Package(s)**: `None` — reuses NestJS first-party `@nestjs/common` already installed in P01.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/user/user.module.ts`, `src/modules/auth/auth.module.ts`, `src/modules/mail/mail.module.ts`, `src/modules/security/security.module.ts`, `src/modules/alerts/alerts.module.ts`, `test/context-layout.e2e-spec.ts`
  - **Modified**: `src/app.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/arch-context-layout` (shared)
- **Commit**: `feat(arch): add empty context modules and register in app module`
- **Testing**: `test/context-layout.e2e-spec.ts` compiles a `Test.createTestingModule` from `AppModule` and asserts all five modules resolve and a smoke route responds; `npm run typecheck`; coverage thresholds unchanged.

### `P02-01d` — Add the context layout conformance spec
- **Description**: Add a static spec that scans `src/modules/` and asserts every non-shared context exposes exactly the four layer folders created by `P02-01a`. Also assert that no file under `src/common/` imports a path referencing `**/domain/**` of any context — this is the explicit "common is domain-free" rule from §5.2. Parse import declarations with the `typescript` compiler API (already a devDependency) rather than regex so aliased and relative imports are handled correctly. Atomic checks: (a) all 5 contexts validated for 4 layers, (b) a common→domain import fails the spec, (c) a missing layer folder fails the spec. Depends on `P02-01a` and `P02-01b`.
- **CLI(s)**: `npm run test:unit -- context-layout`; `npx vitest run test/architecture/context-layout.spec.ts`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `typescript` from devDependencies (installed by P01-01), Node built-ins only.
- **File(s)/Folder(s)**:
  - **Added**: `test/architecture/context-layout.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/arch-context-layout` (shared)
- **Commit**: `test(arch): assert context layer folders and domain-free common`
- **Testing**: The spec asserts the four layer folders per context and fails on a deliberately injected common→domain import (built as an in-memory source string, no file written); negative case uses a `vi.fn()` stub on the file reader to inject the bad import. Full inward-only and domain-purity rules are added in `P02-06`.

### `P02-02a` — Create the DI token registry
- **Description**: Create `src/modules/shared/ports/tokens.ts` exporting the eight injection tokens — `PASSWORD_HASHER`, `TOKEN_ISSUER`, `ENCRYPTION_SERVICE`, `ID_GENERATOR`, `CLOCK`, `CACHE`, `QUEUE`, `MAIL` — each as a uniquely named `Symbol.for(...)` constant so tokens are debuggable in Nest error messages and stable across bundles. Add a branded `PortToken<T>` helper type that binds each token to its future interface so rebinding stays type-safe. This task creates token values only; the matching interfaces arrive in `P02-02b`–`P02-02d`. Atomic checks: (a) exactly eight unique tokens exported, (b) branded helper type present, (c) no infrastructure/Nest imports. Must land before `P02-02b`–`P02-02e`.
- **CLI(s)**: `mkdir -p src/modules/shared/ports`; `npm run test:unit -- tokens`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/ports/tokens.ts`, `src/modules/shared/ports/tokens.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/arch-port-tokens` (shared with `P02-02b` … `P02-02e`)
- **Commit**: `feat(arch): define eight typed DI port tokens in shared kernel`
- **Testing**: `src/modules/shared/ports/tokens.spec.ts` asserts 8 exports, pairwise uniqueness, and the `Symbol.for` descriptions; a compile-time `@ts-expect-error` assertion proves `PortToken<PasswordHasher>` is not assignable to `PortToken<Clock>`. Coverage thresholds pass.

### `P02-02b` — Define the crypto and identity port interfaces
- **Description**: Add three narrow, framework-free interfaces under `src/modules/shared/ports/`, each bound to its token from `P02-02a`: `password-hasher.port.ts` (`hash(plain): Promise<string>`, `verify(plain, digest): Promise<boolean>`), `encryption-service.port.ts` (`encrypt(value): Promise<string>`, `decrypt(ciphertext): Promise<string>`) and `token-issuer.port.ts` (`issue(payload): Promise<string>`, `verify(token): Promise<Claims>`). Keep every method async so remote and CPU-bound adapters are substitutable, and omit adapter-specific options (algorithm names, key paths, TTL config) — those belong in typed config. Atomic checks: (a) three interfaces with only the listed methods, (b) each references its one token, (c) zero Nest/crypto-library imports.
- **CLI(s)**: `npm run test:unit -- ports`; `npm run typecheck`.
- **Package(s)**: `None` — pure TypeScript interfaces; no `argon2`, `jsonwebtoken` or `jose` installed here (adapters arrive in P04/P05).
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/ports/password-hasher.port.ts`, `src/modules/shared/ports/encryption-service.port.ts`, `src/modules/shared/ports/token-issuer.port.ts`, `src/modules/shared/ports/crypto-ports.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/arch-port-tokens` (shared)
- **Commit**: `feat(arch): define password hasher, encryption and token issuer ports`
- **Testing**: `src/modules/shared/ports/crypto-ports.spec.ts` uses Vitest `expectTypeOf` to assert async signatures and the exact input/return shapes; `vi.fn()` mocks satisfy each interface to prove consumer-side substitutability (LSP). `npm run typecheck` passes.

### `P02-02c` — Define the platform port interfaces
- **Description**: Add `id-generator.port.ts` (`next(): string`) and `clock.port.ts` (`now(): Date`) under `src/modules/shared/ports/`, bound to `ID_GENERATOR` and `CLOCK` from `P02-02a`. These two are deliberately the smallest ports in the system so tests can inject deterministic values with `vi.fn()`; no `uuid` or date library is imported at the port layer. Atomic checks: (a) two single-method interfaces, (b) correct token bindings, (c) no runtime imports. Depends on `P02-02a`.
- **CLI(s)**: `npm run test:unit -- ports`; `npm run typecheck`.
- **Package(s)**: `None` — adapter libraries (`uuid`, etc.) are deferred to their implementation phases.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/ports/id-generator.port.ts`, `src/modules/shared/ports/clock.port.ts`, `src/modules/shared/ports/platform-ports.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/arch-port-tokens` (shared)
- **Commit**: `feat(arch): define id generator and clock ports`
- **Testing**: `src/modules/shared/ports/platform-ports.spec.ts` injects `vi.fn(() => fixedDate)` and `vi.fn(() => 'fixed-id')` as adapters and asserts a consumer receives those exact values, proving deterministic test seams; type-level assertions on both signatures.

### `P02-02d` — Define the infrastructure port interfaces
- **Description**: Add `cache.port.ts` (`get<T>(key): Promise<T | null>`, `set<T>(key, value, ttlSeconds?): Promise<void>`, `del(key): Promise<void>`), `queue.port.ts` (`enqueue(name, payload): Promise<void>`) and `mail.port.ts` (`send(message): Promise<void>`) under `src/modules/shared/ports/`, bound to `CACHE`, `QUEUE` and `MAIL` from `P02-02a`. Keep each interface consumer-specific and narrow — no Redis client types, BullMQ job options or provider-specific headers cross this boundary. Atomic checks: (a) three interfaces with only the listed methods, (b) correct token bindings, (c) no `keyv`/`bullmq`/mail-library imports. Depends on `P02-02a`.
- **CLI(s)**: `npm run test:unit -- ports`; `npm run typecheck`.
- **Package(s)**: `None` — `keyv`, `bullmq` and mail adapters are installed in P03, not at the port layer.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/ports/cache.port.ts`, `src/modules/shared/ports/queue.port.ts`, `src/modules/shared/ports/mail.port.ts`, `src/modules/shared/ports/infrastructure-ports.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/arch-port-tokens` (shared)
- **Commit**: `feat(arch): define cache, queue and mail ports`
- **Testing**: `src/modules/shared/ports/infrastructure-ports.spec.ts` type-checks consumer functions that depend only on these interfaces and injects `vi.fn()` implementations, asserting no concrete adapter import is needed; coverage thresholds pass.

### `P02-02e` — Add the port barrel and port-layer purity conformance
- **Description**: Create `src/modules/shared/ports/index.ts` re-exporting all eight port interfaces and the token registry, and extend `src/modules/shared/index.ts` from `P02-01b` to re-export that ports barrel as the kernel's public surface. Add a conformance spec asserting each of the eight tokens is exported exactly once, that no file under `src/modules/shared/ports/` imports from `@nestjs/*`, `typeorm`, `redis`, `bullmq` or any `**/infrastructure/**` path, and that each port interface maps to exactly one token. Atomic checks: (a) 8 tokens + 8 interfaces reachable from the barrel, (b) port layer import-pure, (c) one-to-one token↔port mapping. This is the last atomic of `P02-02`.
- **CLI(s)**: `npm run test:unit -- port-conformance`; `npx vitest run test/architecture/port-conformance.spec.ts`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `typescript` compiler API from devDependencies.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/ports/index.ts`, `test/architecture/port-conformance.spec.ts`
  - **Modified**: `src/modules/shared/index.ts`
  - **Deleted**: `None`
- **Branch**: `feat/arch-port-tokens` (shared)
- **Commit**: `feat(arch): barrel-export ports and assert port layer purity`
- **Testing**: `test/architecture/port-conformance.spec.ts` parses every `src/modules/shared/ports/*.ts` with the TypeScript compiler API, asserts the 8-token/8-interface set, fails on a forbidden import injected via a `vi.fn()`-stubbed source string, and verifies one token per port. Coverage thresholds unchanged.

### `P02-03a` — Create the conformance harness core
- **Description**: Create `src/modules/shared/testing/conformance.ts` exporting `definePortConformance<T>(portName, adapters, spec)`, where `adapters` is an array of `{ name: string; create: () => T | Promise<T> }` and `spec` is a callback receiving a fresh adapter accessor. The harness registers one Vitest `describe` block per adapter with the identical `spec` body, and calls `create()` in `beforeEach` so state cannot leak between adapters or tests; async factory results are awaited. It must import no concrete adapter and no Nest module. Atomic checks: (a) one `describe` per adapter, (b) fresh adapter per test via `beforeEach`, (c) async factory support, (d) no adapter/Nest imports. This is the prerequisite for `P02-03b` and `P02-03c`.
- **CLI(s)**: `mkdir -p src/modules/shared/testing`; `npm run test:unit -- conformance`; `npm run typecheck`.
- **Package(s)**: `None` — uses Vitest's `describe`/`beforeEach` globals already installed by P01-02.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/testing/conformance.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `chore/test-conformance-harness` (shared with `P02-03b` and `P02-03c`)
- **Commit**: `chore(test): add reusable port conformance harness`
- **Testing**: Behavioural proof is in `P02-03b`; this task is verified by `npm run typecheck` and by `P02-03b`'s self-test. The exported signature is used unchanged by every port spec in `P02-03c`.

### `P02-03b` — Add the harness self-test and negative case
- **Description**: Add `src/modules/shared/testing/conformance.spec.ts` proving the harness from `P02-03a` works: define a trivial `Greeter` port and two dummy adapters — an `in-memory` fallback shape and an `alternate` shape — that both satisfy one shared spec, and assert both adapters' describe blocks execute. Add a deliberately broken adapter and prove the harness reports its failure instead of silently skipping it, using a child `vitest run` on a temporary fixture expected to exit non-zero. Add a state-isolation assertion that mutates the in-memory adapter in one test and observes a fresh instance in the next. Atomic checks: (a) two adapters share one unchanged spec, (b) broken adapter fails the harness, (c) state isolated per test.
- **CLI(s)**: `npm run test:unit -- conformance`; `npm run test:cov`.
- **Package(s)**: `None` — Vitest and Node built-ins only.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/testing/conformance.spec.ts`, `src/modules/shared/testing/fixtures/dummy-adapters.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `chore/test-conformance-harness` (shared)
- **Commit**: `test(arch): prove conformance harness shares specs and fails on violation`
- **Testing**: The spec asserts two adapters pass one spec and a third fails; `vi.fn()` spies count factory calls to prove fresh-instance semantics; the negative case asserts the child Vitest process exits 1. Coverage thresholds unchanged.

### `P02-03c` — Add one conformance spec per port and the testing barrel
- **Description**: Create eight conformance spec files under `src/modules/shared/testing/conformance/`, one for each port from `P02-02`: `password-hasher`, `token-issuer`, `encryption-service`, `id-generator`, `clock`, `cache`, `queue`, `mail`. Each calls `definePortConformance()` from `P02-03a` with the port's minimal behavioural contract (e.g. hasher: `verify(hash(plain), plain) === true`; cache: set→get→del; clock: `now()` returns a `Date`; queue: `enqueue` resolves) and with a test-only in-memory fixture from `src/modules/shared/testing/fixtures/memory-adapters.ts`. Add `src/modules/shared/testing/index.ts` exporting the harness only. Later phases append real adapters (Redis, BullMQ, SMTP, Argon2id) to each adapter list without editing the spec body. Atomic checks: (a) 8 spec files, one per port, (b) all use the harness unchanged, (c) fixtures are test-only memory shapes, not production adapters, (d) barrel exports harness.
- **CLI(s)**: `npm run test:unit -- conformance`; `npm run test:cov`.
- **Package(s)**: `None` — in-memory fixtures use plain Maps/`vi.fn()`; no external service packages.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/testing/conformance/password-hasher.conformance.spec.ts`, `src/modules/shared/testing/conformance/token-issuer.conformance.spec.ts`, `src/modules/shared/testing/conformance/encryption-service.conformance.spec.ts`, `src/modules/shared/testing/conformance/id-generator.conformance.spec.ts`, `src/modules/shared/testing/conformance/clock.conformance.spec.ts`, `src/modules/shared/testing/conformance/cache.conformance.spec.ts`, `src/modules/shared/testing/conformance/queue.conformance.spec.ts`, `src/modules/shared/testing/conformance/mail.conformance.spec.ts`, `src/modules/shared/testing/fixtures/memory-adapters.ts`, `src/modules/shared/testing/index.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `chore/test-conformance-harness` (shared)
- **Commit**: `test(arch): add one conformance spec per shared port`
- **Testing**: All 8 specs run via `npm run test:unit -- conformance` and pass against their memory fixtures; each asserts the port's contract exactly once per adapter; `vi.fn()` spies on side-effecting methods (`del`, `enqueue`, `send`); coverage thresholds pass. P03–P05 add adapters to these same lists with zero spec edits (LSP).

## Phase Gate (end of step)

- [ ] Full unit tests + coverage thresholds pass, including all 8 port conformance specs against their memory fixtures.
- [ ] E2E passes for app boot with all five context modules registered.
- [ ] Context layout, domain-free `src/common/` and port-layer purity assertions pass.
- [ ] Conformance harness self-test proves two dummy adapters share one spec and a broken adapter fails.
- [ ] Lint/format/typecheck clean; security audit & version sync run.
- [ ] Each atomic commit pushed on its shared branch; PRs merged into `dev` in this exact order:
  `P02-01a` → `P02-01b` → `P02-01c` → `P02-01d` → `P02-02a` → `P02-02b` → `P02-02c` → `P02-02d` → `P02-02e` → `P02-03a` → `P02-03b` → `P02-03c`.
- [ ] Status for umbrella IDs `P02-01`, `P02-02`, `P02-03` set to `✅ Done` in [`roadmap.md`](../../../roadmap.md) §4 (atomic IDs tracked here).
- [ ] Re-check the P02 exit criterion in [`roadmap.md`](../../../roadmap.md) §6.1 before starting the next step.
