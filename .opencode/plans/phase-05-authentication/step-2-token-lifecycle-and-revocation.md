# P05 · Step 2 — Token Lifecycle & Revocation

**Project:** nestjs-ddd  |  **Phase:** P05 — Authentication  |  **Base branch:** `dev`  |  **Status:** ⬜ Planned

> Source of truth: [`roadmap.md`](../../../roadmap.md) §4. Umbrella IDs `P05-05`, `P05-06`, `P05-07` stay in the roadmap; this file lists the final atomic split (`P05-05a` … `P05-07d`).
> **Format**: `P<phase>-<umbrella><letter>` — one atomic task = one commit; sibling atomic tasks share one branch (branch per umbrella task). Every atomic task uses the 7-field format: `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing`.
> **Ordering notes**: (a) `P05-05a` models the **refresh-token family** as a domain concept, `P05-05b` adds its persistence port + in-memory adapter, `P05-05c` implements rotation with reuse detection, and `P05-05d` exposes the refresh endpoint with theft-detection E2E. (b) `P05-06a` declares the `TOKEN_BLACKLIST` port in the shared kernel; `P05-06b`/`P05-06c` add the Keyv-Redis and memory adapters with TTL cleanup; `P05-06d` runs one conformance spec over **both**, so the memory fallback is a first-class adapter. (c) `P05-07a` models **revocation scope** (account/user/device/session) as a domain value object before `P05-07b` implements the revoke use case over the family store (`P05-05b`) and blacklist (`P05-06a`); `P05-07c`/`P05-07d` add logout and the per-scope E2E matrix. (d) No adapter is imported by a use case — only `TOKEN_ISSUER`, `TOKEN_BLACKLIST` and the family repository tokens.

## DDD + SOLID lens for this step

- Bounded contexts own `domain/`, `application/`, `infrastructure/`, `interfaces/`; dependencies point inward.
- Domain/application depend only on port tokens; adapters are injected, never imported directly.
- Every port ships one conformance spec run against all adapters, including in-memory fallbacks.
- Business rules live in entities/value objects/use cases; controllers stay thin.
- Introduce a port only when a mechanism must be swappable or isolated for tests.
- Refresh-token family and revocation scope are **domain concepts**, not transport fields or cache keys.
- Reuse detection and scope semantics are tested as pure rules before any HTTP surface is added.

## Step Summary

Introduce the refresh-token family with rotation and reuse detection, add a `TOKEN_BLACKLIST` port with conforming Redis/memory adapters and TTL cleanup, then implement logout and multi-scope revocation (account / user / device / session) with an E2E matrix proving each scope invalidates exactly the intended tokens.

## Atomic Tasks

### `P05-05a` — Model the refresh-token family domain concept
- **Description**: Add `src/modules/auth/domain/entities/refresh-token-family.entity.ts` and `src/modules/auth/domain/value-objects/token-hash.vo.ts`. A family groups all refresh tokens descended from one login, stores only salted hashes of tokens (never raw token strings), tracks `currentGeneration`, `status` (active/revoked) and `deviceId`/`sessionId`, and exposes domain methods `rotate(newHash)`, `detectReuse(presentedHash)` and `revokeFamily()`. Reuse detection compares the presented hash against any previous generation and, on a match, marks the whole family revoked — a pure rule with no cache or DB access. Add a thorough domain spec. This is the prerequisite for `P05-05b`/`P05-05c`. Atomic checks: (a) only hashes stored, (b) reuse revokes entire family, (c) rule is framework-free.
- **CLI(s)**: `mkdir -p src/modules/auth/domain/entities src/modules/auth/domain/value-objects`; `npm run test:unit -- refresh-token-family token-hash`; `npm run typecheck`.
- **Package(s)**: `None` — pure domain; hashing helper is the `PASSWORD_HASHER`-style `vi.fn()`-mockable function passed in, no concrete crypto import in `domain/`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/domain/entities/refresh-token-family.entity.ts`, `src/modules/auth/domain/entities/refresh-token-family.entity.spec.ts`, `src/modules/auth/domain/value-objects/token-hash.vo.ts`, `src/modules/auth/domain/value-objects/token-hash.vo.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/auth-refresh-rotation` (shared with `P05-05b`, `P05-05c`, `P05-05d`)
- **Commit**: `feat(auth): model refresh-token family with reuse detection`
- **Testing**: `refresh-token-family.entity.spec.ts` asserts a stored hash never equals a raw token, a valid `rotate` advances the generation, presenting an old generation calls `revokeFamily()`, and any later `rotate` on a revoked family throws. Use faker for token values and `vi.fn()` for the hash function. Coverage thresholds pass.

### `P05-05b` — Add the family repository port and in-memory adapter
- **Description**: Add `src/modules/shared/ports/refresh-token-family-repository.port.ts` with token `REFRESH_TOKEN_FAMILY_REPOSITORY` and narrow methods `save`, `findByHash`, `findById`, `revokeByUser`, `revokeByAccount`, `revokeByDevice`, `revokeBySession`. Add `src/modules/auth/adapters/memory-refresh-token-family.repository.ts` implementing it with a Map, indexing hash → family so reuse detection is O(1); it is production-shaped (supports every revoke method) and is the fallback until a DB adapter is added in a later phase. Depends on `P05-05a` for the entity. Atomic checks: (a) port lives in shared kernel with one token, (b) memory adapter implements all methods, (c) hash index enables lookup.
- **CLI(s)**: `npm run test:unit -- memory-refresh-token-family`; `npm run typecheck`.
- **Package(s)**: `None` — built-in `Map`; reuses the `P02-02` token convention.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/ports/refresh-token-family-repository.port.ts`, `src/modules/auth/adapters/memory-refresh-token-family.repository.ts`, `src/modules/auth/adapters/memory-refresh-token-family.repository.spec.ts`
  - **Modified**: `src/modules/auth/auth.module.ts` (bind the token to the memory adapter)
  - **Deleted**: `None`
- **Branch**: `feat/auth-refresh-rotation` (shared)
- **Commit**: `feat(auth): add refresh-token family repository port and memory adapter`
- **Testing**: `memory-refresh-token-family.repository.spec.ts` asserts save/findByHash round-trips, each `revokeBy*` affects only the matching families, and revoked families cannot be re-rotated; mock with `vi.fn()` only at the boundary. Coverage thresholds pass.

### `P05-05c` — Implement RotateRefreshToken with reuse detection
- **Description**: Add `src/modules/auth/use-cases/rotate-refresh-token.use-case.ts`. Given a presented refresh token, it hashes it, looks up the family via `REFRESH_TOKEN_FAMILY_REPOSITORY` (`P05-05b`), calls the entity's `detectReuse` (`P05-05a`), and on reuse revokes the whole family and raises a security event placeholder for `P08-10`; on a valid current token it rotates, issues a fresh access+refresh pair via `TOKEN_ISSUER` (`P05-04a`) and persists the new hash. Returns `{ tokens, family }`. All dependencies are ports mocked with `vi.fn()` in the spec. Depends on `P05-05a` and `P05-05b`. Atomic checks: (a) reuse invalidates the full family, (b) rotation issues a new pair and persists only its hash, (c) no concrete adapter imported.
- **CLI(s)**: `npm run test:unit -- rotate-refresh-token.use-case`; `npm run typecheck`.
- **Package(s)**: `None` — orchestrates existing `TOKEN_ISSUER` and family repository tokens.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/use-cases/rotate-refresh-token.use-case.ts`, `src/modules/auth/use-cases/rotate-refresh-token.use-case.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/auth-refresh-rotation` (shared)
- **Commit**: `feat(auth): implement refresh rotation with reuse detection`
- **Testing**: Spec mocks both ports with `vi.fn()` and asserts: a current token produces a new pair and one `save`, a previously-used token triggers `revokeFamily()` and zero new token issuances, and a token with no family throws. Coverage thresholds pass.

### `P05-05d` — Add the refresh endpoint and theft-detection E2E
- **Description**: Add `src/modules/auth/interfaces/dto/refresh.dto.ts` and extend `src/modules/auth/interfaces/auth.controller.ts` with `POST /auth/refresh` delegating only to the `P05-05c` use case. Add `test/auth-refresh.e2e-spec.ts` proving: a valid refresh rotates to a new pair, the old token is rejected, re-presenting any old generation triggers family-wide invalidation (theft detection) so even the newest token stops working, and malformed/expired tokens return 401. Depends on `P05-05c`. Atomic checks: (a) endpoint is thin, (b) rotation + theft-detection flows covered, (c) negative paths return 401.
- **CLI(s)**: `npm run test:e2e -- auth-refresh`; `npm run test:cov`.
- **Package(s)**: `None` — reuses Supertest/Vitest from `P01-02`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/interfaces/dto/refresh.dto.ts`, `test/auth-refresh.e2e-spec.ts`
  - **Modified**: `src/modules/auth/interfaces/auth.controller.ts`, `src/modules/auth/auth.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-refresh-rotation` (shared)
- **Commit**: `feat(auth): add refresh endpoint with theft-detection E2E`
- **Testing**: E2E chain: login → refresh → assert new tokens → reuse old → assert 401 and newest token also 401; malformed/expired tokens 401. Fixtures from seeded faker factories; coverage thresholds pass.

### `P05-06a` — Declare the TOKEN_BLACKLIST port in the shared kernel
- **Description**: Add `src/modules/shared/ports/token-blacklist.port.ts` with token `TOKEN_BLACKLIST` and a narrow interface: `add(jti: string, expiresAt: Date)`, `has(jti: string): Promise<boolean>` and `delete(jti: string)`. Accept a `jti`/hash key rather than a raw token, and express TTL via `expiresAt` so every adapter can expire entries uniformly. Keep the port free of Redis/Keyv types. Depends only on the shared-kernel conventions from `P02-02`; `P05-06b`/`P05-06c` implement it and `P05-06d` runs its conformance spec. Atomic checks: (a) one token in shared kernel, (b) no infrastructure imports, (c) TTL expressed port-side.
- **CLI(s)**: `mkdir -p src/modules/shared/ports/conformance`; `npm run test:unit -- token-blacklist.port`; `npm run typecheck`.
- **Package(s)**: `None` — TypeScript interface + DI token.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/ports/token-blacklist.port.ts`, `src/modules/shared/ports/token-blacklist.port.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/auth-blacklist-ttl` (shared with `P05-06b`, `P05-06c`, `P05-06d`)
- **Commit**: `feat(auth): declare TOKEN_BLACKLIST port in the shared kernel`
- **Testing**: `token-blacklist.port.spec.ts` builds a `vi.fn()`-backed fake and asserts the interface compiles with `add`/`has`/`delete`; architecture guard confirms no Keyv/Redis import. Coverage thresholds pass.

### `P05-06b` — Add the Keyv Redis blacklist adapter
- **Description**: Implement `src/modules/auth/adapters/keyv-token-blacklist.adapter.ts` against `TOKEN_BLACKLIST` (`P05-06a`), reusing the Keyv Redis cache adapter and `nestjs-ddd` namespace from `P03-04`. `add(jti, expiresAt)` writes with a TTL computed from `expiresAt - now`; `has` checks existence; `delete` removes the key. Use a dedicated namespace so blacklist keys cannot collide with cache keys. Keep all Keyv/Redis detail inside the adapter. Depends on `P05-06a` and `P03-04`. Atomic checks: (a) implements all port methods, (b) TTL derived from `expiresAt`, (c) namespace isolated.
- **CLI(s)**: `npm run test:unit -- keyv-token-blacklist.adapter`; `npm run typecheck`.
- **Package(s)**: `None` new here — reuses Keyv/Redis packages installed by `P03-04`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/adapters/keyv-token-blacklist.adapter.ts`, `src/modules/auth/adapters/keyv-token-blacklist.adapter.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/auth-blacklist-ttl` (shared)
- **Commit**: `feat(auth): add Keyv Redis token blacklist adapter with TTL`
- **Testing**: `keyv-token-blacklist.adapter.spec.ts` mocks the Keyv instance with `vi.fn()` and asserts the TTL passed to `set` matches `expiresAt`, `has`/`delete` delegate correctly, and the namespace is the blacklist one. Coverage thresholds pass.

### `P05-06c` — Add the in-memory blacklist fallback with TTL cleanup
- **Description**: Add `src/modules/auth/adapters/memory-token-blacklist.adapter.ts` implementing `TOKEN_BLACKLIST` with a Map plus a periodic sweeper that deletes entries whose `expiresAt` has passed (configurable interval from auth config, started via `OnModuleInit` and cleared via `OnModuleDestroy`). It must obey the identical `add`/`has`/`delete` contract — including TTL expiry — so the conformance spec in `P05-06d` passes unchanged. Bind it in `AuthModule` for non-production/test env. Depends on `P05-06a`. Atomic checks: (a) same port contract, (b) expired entries removed by sweeper, (c) lifecycle hooks clean up the timer.
- **CLI(s)**: `npm run test:unit -- memory-token-blacklist.adapter`; `npm run typecheck`.
- **Package(s)**: `None` — built-in `Map` and `setInterval`/`clearInterval`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/adapters/memory-token-blacklist.adapter.ts`, `src/modules/auth/adapters/memory-token-blacklist.adapter.spec.ts`
  - **Modified**: `src/modules/auth/auth.module.ts` (env-driven binding)
  - **Deleted**: `None`
- **Branch**: `feat/auth-blacklist-ttl` (shared)
- **Commit**: `feat(auth): add in-memory token blacklist fallback with TTL cleanup`
- **Testing**: `memory-token-blacklist.adapter.spec.ts` uses fake timers (`vi.useFakeTimers()`) to advance past `expiresAt` and assert `has` becomes false and the sweeper removed the entry; lifecycle hook spec confirms the interval is cleared. Coverage thresholds pass.

### `P05-06d` — Add the TOKEN_BLACKLIST conformance spec across all adapters
- **Description**: Create `src/modules/shared/ports/conformance/token-blacklist.conformance-spec.ts` using the `P02-03` harness over both the Keyv Redis adapter (`P05-06b`) and the memory fallback (`P05-06c`). Shared cases assert: an added `jti` is `has`-true, `delete` makes it false, a non-existent `jti` is false, and an entry past `expiresAt` is no longer considered present. A new blacklist adapter is accepted only when this spec passes unchanged, proving both adapters (including the memory fallback) are substitutable. Depends on `P05-06b` and `P05-06c`. Atomic checks: (a) one spec, two adapters, (b) memory fallback conforms including TTL, (c) LSP substitution proven.
- **CLI(s)**: `npm run test:unit -- token-blacklist.conformance`; `npm run test:cov`.
- **Package(s)**: `None` — reuses the `P02-03` conformance harness.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/ports/conformance/token-blacklist.conformance-spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/auth-blacklist-ttl` (shared)
- **Commit**: `test(auth): add TOKEN_BLACKLIST conformance spec for Redis and memory`
- **Testing**: `describe.each` over both adapter factories; Redis side mocks Keyv with `vi.fn()`, memory side uses fake timers for TTL. Assert identical results for all four cases; coverage thresholds pass. This is the required blacklist conformance across **all** adapters, memory included.

### `P05-07a` — Model the revocation scope domain concept
- **Description**: Add `src/modules/auth/domain/value-objects/revocation-scope.vo.ts` defining `RevocationScope` as one of `account | user | device | session`, with a `matches(family)` predicate that decides whether a given refresh-token family is affected: `account` matches all families of the account, `user` all of the user, `device` those with the same `deviceId`, `session` only the exact `sessionId`. Add `src/modules/auth/domain/value-objects/revocation-command.vo.ts` carrying a scope plus its target identifiers, validated in the constructor. Keep both framework-free. This is the prerequisite for `P05-07b`. Atomic checks: (a) four scopes modelled as domain values, (b) `matches` logic is pure and exhaustive, (c) invalid targets rejected.
- **CLI(s)**: `npm run test:unit -- revocation-scope revocation-command`; `npm run typecheck`.
- **Package(s)**: `None` — pure domain value objects.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/domain/value-objects/revocation-scope.vo.ts`, `src/modules/auth/domain/value-objects/revocation-scope.vo.spec.ts`, `src/modules/auth/domain/value-objects/revocation-command.vo.ts`, `src/modules/auth/domain/value-objects/revocation-command.vo.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/auth-revocation-scopes` (shared with `P05-07b`, `P05-07c`, `P05-07d`)
- **Commit**: `feat(auth): model revocation scope as a domain value object`
- **Testing**: `revocation-scope.vo.spec.ts` table-tests every scope against families with matching/mismatching account/user/device/session and asserts exactly the expected subset matches; command spec rejects missing/invalid targets. Coverage thresholds pass.

### `P05-07b` — Implement the RevokeTokens use case
- **Description**: Add `src/modules/auth/use-cases/revoke-tokens.use-case.ts`. Given a `RevocationCommand` (`P05-07a`), it selects the matching families using the scope predicate (via the family repository's `revokeBy*` methods from `P05-05b`), revokes them, and writes the corresponding access-token `jti`s to `TOKEN_BLACKLIST` (`P05-06a`) with `expiresAt` derived from their expiry, so already-issued access tokens stop working immediately. It is orchestration only: all rules live in the scope VO and the blacklist/family adapters. Depends on `P05-07a`, `P05-05b` and `P05-06a`. Atomic checks: (a) scope predicate drives selection, (b) blacklist entries get correct TTL, (c) no adapter imported by the use case.
- **CLI(s)**: `npm run test:unit -- revoke-tokens.use-case`; `npm run typecheck`.
- **Package(s)**: `None` — ports only.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/use-cases/revoke-tokens.use-case.ts`, `src/modules/auth/use-cases/revoke-tokens.use-case.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/auth-revocation-scopes` (shared)
- **Commit**: `feat(auth): implement multi-scope RevokeTokens use case`
- **Testing**: Spec mocks family repository, blacklist and issuer with `vi.fn()` and asserts: `session` revokes one family and adds one blacklist entry, `device` revokes only matching-device families, `account`/`user` revoke broadly, and each `add` receives the token `expiresAt`. Coverage thresholds pass.

### `P05-07c` — Add the logout endpoint
- **Description**: Extend `src/modules/auth/interfaces/auth.controller.ts` with `POST /auth/logout` guarded by `JwtAuthGuard` (`P05-04d`), extracting the current session/device identifiers from the request principal and issuing a `RevocationCommand` of scope `session` to the `P05-07b` use case. Also revoke that session's refresh family. The controller stays thin — it builds the command and delegates. Add `test/auth-logout.e2e-spec.ts` proving that after logout the used access token and refresh token are rejected (401). Depends on `P05-07b`. Atomic checks: (a) logout guards the route, (b) session-scoped command built, (c) both token types invalidated.
- **CLI(s)**: `npm run test:e2e -- auth-logout`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/interfaces/dto/logout.dto.ts`, `test/auth-logout.e2e-spec.ts`
  - **Modified**: `src/modules/auth/interfaces/auth.controller.ts`, `src/modules/auth/auth.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-revocation-scopes` (shared)
- **Commit**: `feat(auth): add logout endpoint with session-scoped revocation`
- **Testing**: E2E: login → call logout with the access token → reuse access token and refresh token → both return 401; a second session's tokens remain valid. Controller spec asserts one `vi.fn()` call to `RevokeTokens` with a `session` command. Coverage thresholds pass.

### `P05-07d` — Add the multi-scope revocation E2E matrix
- **Description**: Add `test/auth-revocation-scopes.e2e-spec.ts` exercising all four scopes with multiple sessions/devices created from one account: revoke `session` → only that session dies; `device` → all sessions on that device die; `user` → all the user's sessions die but a different user survives; `account` → every session for the account dies. Assert the blacklist TTL cleanup (`P05-06c`) eventually removes expired entries without revoking live tokens. Depends on `P05-07c`. Atomic checks: (a) all four scopes covered, (b) exact intended-token invalidation, (c) TTL cleanup does not over-revoke.
- **CLI(s)**: `npm run test:e2e -- auth-revocation`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `test/auth-revocation-scopes.e2e-spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/auth-revocation-scopes` (shared)
- **Commit**: `test(auth): add E2E matrix for all revocation scopes`
- **Testing**: Matrix test creates 3–4 sessions via faker fixtures and asserts post-revocation 200/401 for each token; use fake timers for TTL cleanup assertions; port mocks use `vi.fn()`. Coverage thresholds pass and all port conformance specs remain green.

## Phase Gate (end of step)

- [ ] Full unit tests + coverage thresholds pass, including `TOKEN_BLACKLIST` conformance against **both** adapters (Keyv Redis + memory fallback, TTL included) and the family/rotation rules as pure domain specs.
- [ ] E2E passes for refresh rotation, theft detection (family-wide invalidation), logout and the four-scope revocation matrix, plus 401 negative paths.
- [ ] Refresh-token family and revocation scope are modelled in `domain/`; no adapter is imported by a use case.
- [ ] No raw token strings stored in families or blacklist; TTL cleanup verified.
- [ ] Lint / format / typecheck clean; security audit & version sync pass.
- [ ] Each atomic commit pushed on its shared branch; PR merged into `dev` in this exact order:
  `P05-05a` → `P05-05b` → `P05-05c` → `P05-05d` → `P05-06a` → `P05-06b` → `P05-06c` → `P05-06d` → `P05-07a` → `P05-07b` → `P05-07c` → `P05-07d`.
- [ ] Status for umbrella IDs `P05-05`, `P05-06`, `P05-07` set to `✅ Done` in [`roadmap.md`](../../../roadmap.md) §4 (atomic IDs tracked here).
- [ ] Re-check the P05 exit criterion in [`roadmap.md`](../../../roadmap.md) §6.1 before starting the next step.
