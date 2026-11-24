# P06 · Step 1 — OAuth2 Foundation

**Project:** nestjs-ddd  |  **Phase:** P06 — Federated Identity  |  **Base branch:** `dev`  |  **Status:** ⬜ Planned

> Source of truth: [`roadmap.md`](../../../roadmap.md) §4. Umbrella IDs `P06-01`, `P06-02` stay in the roadmap; this file lists the final atomic split (`P06-01a` … `P06-02d`).
> **Format**: `P<phase>-<umbrella><letter>` — one atomic task = one commit; sibling atomic tasks share one branch (branch per umbrella task). Every atomic task uses the 7-field format: `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing`.
> **Branch model**: `P06-01a` … `P06-01d` share `feat/auth-oauth2-foundation`; `P06-02a` … `P06-02d` share `feat/auth-oauth-merge-gate`. All branches are cut from `dev` and merged back in the order listed in the Phase Gate.
> **Ordering notes**: (a) `P06-01a` defines the port and `StandardProfile` value object first; the factory (`P06-01b`) and normalizer (`P06-01c`) both depend on them, and the merge gate (`P06-02b`) consumes `StandardProfile`. (b) `P06-01d` adds validated env keys but does not register any strategy — provider registration is `P06 Step 2`. (c) `P06-02a` extends the user repository port first so `P06-02b` can depend on the new find/link methods; its conformance spec is updated in the same atomic. (d) `P06-02c` keeps the callback controller thin — all merge decisions stay in `P06-02b`.

## DDD + SOLID lens for this step

- Bounded contexts own `domain/`, `application/`, `infrastructure/`, `interfaces/`; dependencies point inward.
- Domain/application depend only on port tokens; adapters are injected, never imported directly.
- Every port ships one conformance spec run against all adapters, including in-memory fallbacks.
- Business rules live in entities/value objects/use cases; controllers stay thin.
- Introduce a port only when a mechanism must be swappable or isolated for tests.

## Step Summary

Establish one generic OAuth2 strategy factory and one standard profile normalizer behind a narrow provider port, then add the link-or-create use case that merges federated identities only on a verified email — guaranteeing `sub`-keyed identity, no duplicate users per email, and no unverified-email merge. Keep client IDs/secrets in validated env only and never commit them.

## Atomic Tasks

### `P06-01a` — Define the OAuth2 provider port and StandardProfile value object
- **Description**: Define the narrow `OAuth2ProviderPort` interface (token set → `StandardProfile`) and its DI token `OAUTH2_PROVIDER` in `src/modules/shared/tokens/`, plus the framework-free `StandardProfile` value object in `src/modules/auth/domain/oauth2/`. The value object carries exactly the fields the merge gate needs: `sub`, `email`, `emailVerified`, `provider`, `displayName`, with a guard that `sub` is non-empty and `email` is normalised to lowercase. Keep the domain layer free of Nest, Passport and HTTP imports. This is the foundational atomic; `P06-01b`, `P06-01c` and `P06-02b` all depend on it. Atomic checks: (a) port token exported from `src/modules/shared/tokens/`, (b) `StandardProfile` rejects a blank `sub` and lowercases `email`, (c) no framework import under `domain/oauth2/`.
- **CLI(s)**: `mkdir -p src/modules/auth/domain/oauth2 src/modules/shared/tokens`; `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — pure domain types and a token; only Vitest (`vi.fn()`) is used in the spec.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/domain/oauth2/standard-profile.ts`, `src/modules/auth/domain/oauth2/standard-profile.spec.ts`, `src/modules/auth/domain/oauth2/oauth2-provider.port.ts`, `src/modules/shared/tokens/oauth2.token.ts`
  - **Modified**: `src/modules/shared/tokens/index.ts` (re-export `OAUTH2_PROVIDER`)
  - **Deleted**: `None`
- **Branch**: `feat/auth-oauth2-foundation` (shared with `P06-01b` … `P06-01d`)
- **Commit**: `feat(auth): define oauth2 provider port and standard profile value object`
- **Testing**: Unit spec asserts `StandardProfile` lowercases `email`, rejects an empty `sub` and preserves `provider`/`emailVerified`; type-level unit spec confirms `OAuth2ProviderPort` has a single `getProfile(tokens)` method; architecture guard from `P02-06` proves `domain/oauth2/` imports no Nest/Passport module. Coverage thresholds pass.

### `P06-01b` — Build the generic OAuth2 strategy factory
- **Description**: Add `src/modules/auth/adapters/oauth2/oauth2-strategy.factory.ts` exporting `createOAuth2Strategy(config)` that returns a configured Passport strategy built on the generic `passport-oauth2` base (authorization URL, token URL, client ID/secret, callback URL, scope). The factory must contain zero provider-specific branching — it only wires endpoints and delegates profile fetching to the injected `OAuth2ProviderPort` from `P06-01a`. No credentials are hard-coded; all values come from the typed OAuth2 config argument. Atomic checks: (a) one factory, no provider `switch`/`if` chain, (b) strategy delegates to `getProfile`, (c) no literal client ID/secret in source.
- **CLI(s)**: `npm install passport-oauth2`; `npm install -D @types/passport-oauth2 @types/passport`; `mkdir -p src/modules/auth/adapters/oauth2`; `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `@nestjs/passport` and `passport` are already installed by `P05-01`; newly install `passport-oauth2` (runtime) and `@types/passport-oauth2`, `@types/passport` (dev) in the root `package.json` via the CLI commands above.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/adapters/oauth2/oauth2-strategy.factory.ts`, `src/modules/auth/adapters/oauth2/oauth2-strategy.factory.spec.ts`
  - **Modified**: `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `feat/auth-oauth2-foundation` (shared)
- **Commit**: `feat(auth): add generic oauth2 strategy factory`
- **Testing**: Unit spec uses `vi.fn()` for the `OAuth2ProviderPort` and asserts the returned strategy calls `getProfile` once with the token set and that config values map to the correct Passport options; negative spec asserts a missing `callbackURL` throws at creation; grep-style test asserts no provider names appear in the factory source. Coverage thresholds pass.

### `P06-01c` — Implement the standard profile normalizer
- **Description**: Add `StandardProfileNormalizer` in `src/modules/auth/adapters/oauth2/profile-normalizer.ts` that converts a raw provider profile into the `StandardProfile` from `P06-01a`. It reads `sub`/`id` for the stable identity, `email` plus a provider-supplied verified-email flag, and a display name, defaulting `emailVerified` to `false` when the provider does not assert verification (fail closed). The normalizer is the single place profile-field mapping lives; every thin provider adapter in `P06 Step 2` delegates to it rather than mapping fields itself. Atomic checks: (a) one normalizer used by all providers, (b) missing verification → `emailVerified: false`, (c) output validates as `StandardProfile`.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `StandardProfile` from `P06-01a` and Vitest for specs.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/adapters/oauth2/profile-normalizer.ts`, `src/modules/auth/adapters/oauth2/profile-normalizer.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/auth-oauth2-foundation` (shared)
- **Commit**: `feat(auth): add standard oauth2 profile normalizer`
- **Testing**: Unit spec feeds faker-generated raw profiles (varied field shapes) and asserts a single `StandardProfile` shape; negative spec asserts an unverified/missing email flag yields `emailVerified: false` and a blank `sub` is rejected; spec asserts all mappings route through this one class. Coverage thresholds pass.

### `P06-01d` — Add validated OAuth2 config namespace and env keys
- **Description**: Extend the Joi env schema in `src/common/config/validation/env.validation.ts` with OAuth2 client ID/secret keys (placeholders used by later provider adapters, e.g. `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, etc.) and add `src/common/config/oauth.config.ts` using `registerAs('oauth2', ...)` to expose them typed, appended to the `load` array in `src/common/config/config.module.ts`. Secrets are read from env only — no client secret is ever committed, logged or placed in OpenAPI examples. This atomic only declares config; it does not register any strategy (that is `P06 Step 2`). Atomic checks: (a) Joi keys present and required in non-dev, (b) typed registerAs namespace exported as `as Provider()`, (c) no secret literal in tracked files.
- **CLI(s)**: `npm run test:unit`; `NODE_ENV=production PORT=abc npm run start` (must fail fast on missing/invalid keys); `npm run typecheck`.
- **Package(s)**: `None` — reuses `@nestjs/config` and Joi from `P01-04`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/config/oauth.config.ts`, `src/common/config/oauth.config.spec.ts`
  - **Modified**: `src/common/config/validation/env.validation.ts`, `src/common/config/config.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-oauth2-foundation` (shared)
- **Commit**: `feat(config): add validated oauth2 config namespace and env keys`
- **Testing**: Unit spec asserts `oauthConfig()` returns typed values and is injectable via `as Provider()` in `Test.createTestingModule()`; negative spec asserts the Joi schema throws when a required secret is missing under production; grep self-test asserts no `*CLIENT_SECRET` value appears in `src/`. Coverage thresholds pass.

### `P06-02a` — Extend the user repository port with sub/email lookup and link methods
- **Description**: Extend the user repository port (from `P04-03`) with `findBySub(sub)`, `findByEmail(email)` and `linkExternalIdentity(userId, sub, provider)` methods, and update both the TypeORM adapter and the in-memory fallback to implement them, then extend the shared conformance spec so the new methods are exercised identically across adapters. `findBySub` is the canonical lookup key; `findByEmail` is used only by the verified-email merge gate. Atomic checks: (a) three new port methods typed, (b) conformance spec covers them for every adapter, (c) no duplicate row possible for one email at the port boundary.
- **CLI(s)**: `npm run test:unit`; `npm run test:cov -- user-repository`; `npm run typecheck`.
- **Package(s)**: `None` — reuses TypeORM and the conformance harness from `P03`/`P04`.
- **File(s)/Folder(s)**:
  - **Added**: `None`
  - **Modified**: `src/modules/user/domain/user.repository.port.ts`, `src/modules/user/infrastructure/typeorm-user.repository.ts`, `src/modules/user/infrastructure/in-memory-user.repository.ts`, `src/modules/user/infrastructure/user.repository.conformance-spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-oauth-merge-gate` (shared with `P06-02b` … `P06-02d`)
- **Commit**: `feat(user): extend user repository port with sub lookup and link methods`
- **Testing**: Conformance spec (unchanged across both adapters) asserts `findBySub` returns the linked user, `findByEmail` finds by normalised lowercase email, and `linkExternalIdentity` attaches a `sub` without creating a second row; negative spec asserts two links for the same email do not duplicate users. Coverage thresholds pass.

### `P06-02b` — Implement link-or-create with the verified-email merge gate
- **Description**: Add `LinkOrCreateUserUseCase` in `src/modules/auth/use-cases/` that consumes a `StandardProfile` (`P06-01a`). Logic: if `findBySub(sub)` hits → return that user; else if `emailVerified` and `findByEmail(email)` hits → link the external `sub` to the existing user via `linkExternalIdentity`; else create a new user keyed by `sub`. An unverified email must never trigger a merge and must never create a second row for an existing email — it links only by `sub`. All I/O goes through ports mocked with `vi.fn()`. This depends on `P06-01a` and `P06-02a`; `P06-02c` wires it to HTTP. Atomic checks: (a) sub match returns existing user, (b) unverified email never merges and never duplicates, (c) verified email merges into exactly one row.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — pure use case; ports mocked with `vi.fn()`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/use-cases/link-or-create-user.use-case.ts`, `src/modules/auth/use-cases/link-or-create-user.use-case.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/auth-oauth-merge-gate` (shared)
- **Commit**: `feat(auth): implement link-or-create with verified-email merge gate`
- **Testing**: Use-case unit spec with `vi.fn()` mocks for the repository port covering: existing `sub` → no write; verified email match → exactly one `linkExternalIdentity` call and no create; unverified email → zero links and zero duplicates; new user → one create keyed by `sub`. Negative spec asserts a duplicate-email create attempt is rejected. Coverage thresholds pass.

### `P06-02c` — Add the thin OAuth2 callback controller and guard
- **Description**: Add an OAuth2 authentication guard and a callback controller in `src/modules/auth/interfaces/` that protect the provider callback route, read the normalised profile from the strategy and delegate straight to `LinkOrCreateUserUseCase` (`P06-02b`), then issue tokens via `TOKEN_ISSUER`. The controller contains no merge logic — it translates HTTP ↔ use case only. Wire the guard, strategy and use case into `src/modules/auth/auth.module.ts`. Atomic checks: (a) controller has no business rules, (b) guard rejects an unauthenticated callback, (c) successful callback calls the use case exactly once.
- **CLI(s)**: `mkdir -p src/modules/auth/interfaces src/modules/auth/guards`; `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `@nestjs/passport`, `TOKEN_ISSUER` and the strategy factory from `P06-01`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/guards/oauth2-auth.guard.ts`, `src/modules/auth/guards/oauth2-auth.guard.spec.ts`, `src/modules/auth/interfaces/oauth2-callback.controller.ts`, `src/modules/auth/interfaces/oauth2-callback.controller.spec.ts`
  - **Modified**: `src/modules/auth/auth.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-oauth-merge-gate` (shared)
- **Commit**: `feat(auth): add thin oauth2 callback controller and guard`
- **Testing**: Unit spec with `vi.fn()` mocks asserts the controller calls `LinkOrCreateUserUseCase` and `TOKEN_ISSUER` once and returns the token pair; guard spec asserts unauthenticated requests are rejected; E2E asserts the callback route is reachable only through the guard. Coverage thresholds pass.

### `P06-02d` — Cover merge scenarios end-to-end
- **Description**: Add `test/oauth2-merge.e2e-spec.ts` exercising the callback flow with mocked provider responses from `P06 Step 2` (reuse a fake `OAuth2ProviderPort` via `vi.fn()`). Cover: first-time `sub` creates one user, verified email merges into exactly one existing row, unverified email never merges and creates no duplicate, and a repeat callback with the same `sub` is idempotent. Assert no duplicate users per email in the repository after every scenario. Atomic checks: (a) all four scenarios present, (b) unverified-email and duplicate-email negative paths asserted, (c) user count stays at one per email.
- **CLI(s)**: `npm run test:e2e -- oauth2-merge`; `npm run test:cov`; `npm run test:unit`.
- **Package(s)**: `None` — reuses in-memory adapters and faker fixtures from `P01`/`P03`.
- **File(s)/Folder(s)**:
  - **Added**: `test/oauth2-merge.e2e-spec.ts`
  - **Modified**: `src/modules/auth/use-cases/link-or-create-user.use-case.spec.ts` (cross-check assertions)
  - **Deleted**: `None`
- **Branch**: `feat/auth-oauth-merge-gate` (shared)
- **Commit**: `test(auth): cover oauth2 merge scenarios end-to-end`
- **Testing**: E2E suite with `vi.fn()` mocked provider responses and faker fixtures; asserts the four scenarios above and queries the in-memory repository to prove one row per email; negative paths (unverified email, duplicate email) return the expected result without extra rows. Coverage thresholds pass.

## Phase Gate (end of step)

- [ ] Full unit tests + coverage thresholds pass.
- [ ] E2E passes for OAuth2 callback, sub-lookup, verified-email merge gate and no-duplicate-user invariant.
- [ ] Conformance specs pass for the extended user repository port across TypeORM and in-memory adapters.
- [ ] Security audit & version sync pass; no client secrets or PII committed.
- [ ] Each atomic commit pushed on its shared branch; PR merged into `dev` in this exact order:
  `P06-01a` → `P06-01b` → `P06-01c` → `P06-01d` → `P06-02a` → `P06-02b` → `P06-02c` → `P06-02d`.
- [ ] Status for umbrella IDs `P06-01`, `P06-02` set to `✅ Done` in [`roadmap.md`](../../../roadmap.md) §4 (atomic IDs tracked here).
- [ ] Re-check the P06 exit criterion in [`roadmap.md`](../../../roadmap.md) §6.1 before starting the next step.
