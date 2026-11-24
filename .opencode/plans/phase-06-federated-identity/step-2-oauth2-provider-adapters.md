# P06 · Step 2 — OAuth2 Provider Adapters

**Project:** nestjs-ddd  |  **Phase:** P06 — Federated Identity  |  **Base branch:** `dev`  |  **Status:** ⬜ Planned

> Source of truth: [`roadmap.md`](../../../roadmap.md) §4. Umbrella IDs `P06-03`, `P06-04`, `P06-05`, `P06-06`, `P06-07` stay in the roadmap; this file lists the final atomic split (`P06-03a` … `P06-07c`).
> **Format**: `P<phase>-<umbrella><letter>` — one atomic task = one commit; sibling atomic tasks share one branch (branch per umbrella task). Every atomic task uses the 7-field format: `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing`.
> **Branch model**: one branch per provider: `feat/auth-oauth-google`, `feat/auth-oauth-microsoft`, `feat/auth-oauth-github`, `feat/auth-oauth-apple`, `feat/auth-oauth-x`, each cut from `dev` and merged back in the Phase Gate order.
> **Ordering notes**: (a) every provider depends on the generic factory, normalizer, `StandardProfile` and validated env keys from `P06 Step 1` (`P06-01a` … `P06-01d`) and on the link-or-create use case (`P06-02b`); do not start this step until P06 Step 1 is merged. (b) Within each provider, the `<letter>a` atomic adds the strategy package + validated env keys, `<letter>b` implements the thin adapter using the shared factory/normalizer, and `<letter>c` registers it and adds E2E with mocked responses. (c) Each adapter must remain THIN — its only custom code is passing endpoint config and delegating profile mapping to the shared `StandardProfileNormalizer`; no provider reimplements the merge gate. (d) Providers are independent of each other and may be merged in any order, but the Phase Gate lists a deterministic order.

## DDD + SOLID lens for this step

- Bounded contexts own `domain/`, `application/`, `infrastructure/`, `interfaces/`; dependencies point inward.
- Domain/application depend only on port tokens; adapters are injected, never imported directly.
- Every port ships one conformance spec run against all adapters, including in-memory fallbacks.
- Business rules live in entities/value objects/use cases; controllers stay thin.
- Introduce a port only when a mechanism must be swappable or isolated for tests.

## Step Summary

Add five thin OAuth2 provider adapters — Google, Microsoft, GitHub, Apple and X — each built on the single generic strategy factory and profile normalizer from P06 Step 1. Each provider contributes only endpoint config, strategy registration and a small profile-mapping override; the verified-email merge gate and token issuance stay shared. All client IDs/secrets come from validated env, no secrets are committed, and each provider is proven with E2E tests using mocked provider responses plus negative paths.

## Atomic Tasks

### `P06-03a` — Add Google strategy package and validated env keys
- **Description**: Install the Google OAuth2 Passport strategy package and extend the Joi env schema and `oauth.config.ts` (from `P06-01d`) with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_CALLBACK_URL`. The auth module must only register the Google strategy when the keys are present, so a partial config never produces a broken strategy. No secret value is committed. This depends on `P06-01d`; `P06-03b` consumes the config and package. Atomic checks: (a) package installed, (b) three env keys validated and typed, (c) no secret literal in tracked files.
- **CLI(s)**: `npm install passport-google-oauth20`; `npm install -D @types/passport-google-oauth20`; `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `@nestjs/passport`, `passport`, `passport-oauth2` already installed by `P05-01`/`P06-01b`; newly install `passport-google-oauth20` (runtime) and `@types/passport-google-oauth20` (dev) in root `package.json`.
- **File(s)/Folder(s)**:
  - **Added**: `None`
  - **Modified**: `src/common/config/validation/env.validation.ts`, `src/common/config/oauth.config.ts`, `src/common/config/oauth.config.spec.ts`, `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `feat/auth-oauth-google` (shared with `P06-03b`, `P06-03c`)
- **Commit**: `feat(config): add google oauth2 strategy package and env keys`
- **Testing**: Unit spec asserts `oauthConfig()` exposes the three Google keys and that the Joi schema rejects a missing client secret under production; grep self-test asserts no real secret value present; coverage thresholds pass.

### `P06-03b` — Implement the thin Google provider adapter
- **Description**: Add `GoogleOAuth2Adapter` in `src/modules/auth/adapters/oauth2/providers/` implementing `OAuth2ProviderPort` (`P06-01a`). It configures the generic strategy factory (`P06-01b`) with Google's auth/token endpoints and scopes, and maps Google's profile (`sub`/`id`, `emails[0].value`, `email_verified`, `displayName`) into `StandardProfile` by delegating to the shared `StandardProfileNormalizer` (`P06-01c`). No merge logic and no duplicate profile mapping may live in this file. Atomic checks: (a) adapter implements the port, (b) mapping delegates to the normalizer, (c) unverified Google email → `emailVerified: false`.
- **CLI(s)**: `mkdir -p src/modules/auth/adapters/oauth2/providers`; `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses the Google package from `P06-03a` and the shared factory/normalizer/port from `P06 Step 1`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/adapters/oauth2/providers/google-oauth2.adapter.ts`, `src/modules/auth/adapters/oauth2/providers/google-oauth2.adapter.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/auth-oauth-google` (shared)
- **Commit**: `feat(auth): add thin google oauth2 provider adapter`
- **Testing**: Unit spec with a faker-generated Google profile asserts the adapter calls the normalizer once and produces a `StandardProfile` with lowercase email and correct `sub`; negative spec asserts a profile with `email_verified: false` yields `emailVerified: false` and an empty `sub` throws; coverage thresholds pass.

### `P06-03c` — Register Google and cover the callback with mocked responses
- **Description**: Register `GoogleOAuth2Adapter` in `src/modules/auth/auth.module.ts` and add `test/oauth-google.e2e-spec.ts` driving the callback (`P06-02c`) with a mocked Google token/profile response via `vi.fn()`. Cover the happy path (new `sub` creates one user, tokens issued) and the negative paths (unverified email does not merge, a repeat callback is idempotent, no duplicate user per email). Assert client secrets are read from validated env only. Atomic checks: (a) strategy registered, (b) E2E happy + negative paths, (c) no duplicate users.
- **CLI(s)**: `npm run test:e2e -- oauth-google`; `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `test/oauth-google.e2e-spec.ts`
  - **Modified**: `src/modules/auth/auth.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-oauth-google` (shared)
- **Commit**: `test(auth): register google oauth2 and cover callback with mocked responses`
- **Testing**: E2E with `vi.fn()` mocked Google responses asserts the callback delegates to the shared use case and returns a token pair; negative specs assert unverified email and duplicate email create no extra rows; in-memory repository queried to confirm one user per email. Coverage thresholds pass.

### `P06-04a` — Add Microsoft strategy package and validated env keys
- **Description**: Install a Microsoft OAuth2 Passport strategy package and extend the Joi env schema and `oauth.config.ts` with `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_CALLBACK_URL` and optional `MICROSOFT_TENANT`. Read tenant-scoped authority config from validated env; do not commit secrets. Depends on `P06-01d`. Atomic checks: (a) package installed, (b) env keys validated and typed, (c) no secret literal committed.
- **CLI(s)**: `npm install passport-microsoft`; `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `@nestjs/passport`, `passport`, `passport-oauth2` already installed; newly install `passport-microsoft` (runtime) in root `package.json`.
- **File(s)/Folder(s)**:
  - **Added**: `None`
  - **Modified**: `src/common/config/validation/env.validation.ts`, `src/common/config/oauth.config.ts`, `src/common/config/oauth.config.spec.ts`, `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `feat/auth-oauth-microsoft` (shared with `P06-04b`, `P06-04c`)
- **Commit**: `feat(config): add microsoft oauth2 strategy package and env keys`
- **Testing**: Unit spec asserts the Microsoft keys are typed and required in production; a secret-absence negative spec asserts Joi fails fast; coverage thresholds pass.

### `P06-04b` — Implement the thin Microsoft provider adapter
- **Description**: Add `MicrosoftOAuth2Adapter` implementing `OAuth2ProviderPort`, configuring the shared factory with Microsoft's authorization/token endpoints (tenant-aware via config) and mapping Microsoft's profile (`sub`/`oid`, `mail`/`userPrincipalName`, verified-email claim, `displayName`) into `StandardProfile` through the shared normalizer. Prefer the immutable `sub`/`oid` claim as identity; never use a mutable email as the primary key. Atomic checks: (a) adapter implements the port, (b) mapping delegates to normalizer, (c) `oid`/`sub` used as identity.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `P06-04a` package and `P06 Step 1` shared components.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/adapters/oauth2/providers/microsoft-oauth2.adapter.ts`, `src/modules/auth/adapters/oauth2/providers/microsoft-oauth2.adapter.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/auth-oauth-microsoft` (shared)
- **Commit**: `feat(auth): add thin microsoft oauth2 provider adapter`
- **Testing**: Unit spec with a faker Microsoft profile asserts `sub`/`oid` becomes identity, email is lowercased, and the normalizer is called once; negative spec for missing verified claim → `emailVerified: false`; coverage thresholds pass.

### `P06-04c` — Register Microsoft and cover the callback with mocked responses
- **Description**: Register `MicrosoftOAuth2Adapter` in `auth.module.ts` and add `test/oauth-microsoft.e2e-spec.ts` with `vi.fn()` mocked Microsoft token/profile responses. Cover happy path, unverified-email no-merge, repeat-callback idempotency and no-duplicate-user assertions. Atomic checks: (a) strategy registered, (b) E2E happy + negative paths, (c) one user per email.
- **CLI(s)**: `npm run test:e2e -- oauth-microsoft`; `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `test/oauth-microsoft.e2e-spec.ts`
  - **Modified**: `src/modules/auth/auth.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-oauth-microsoft` (shared)
- **Commit**: `test(auth): register microsoft oauth2 and cover callback with mocked responses`
- **Testing**: E2E with `vi.fn()` mocked Microsoft responses asserts token issuance, unverified-email and duplicate-email negative paths, and a single row per email in the in-memory repository; coverage thresholds pass.

### `P06-05a` — Add GitHub strategy package and validated env keys
- **Description**: Install a GitHub OAuth2 Passport strategy package and extend the Joi env schema and `oauth.config.ts` with `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` and `GITHUB_CALLBACK_URL`. GitHub does not always return a verified-email flag, so config must expose an explicit flag or the normalizer must fail closed. No secrets committed. Depends on `P06-01d`. Atomic checks: (a) package installed, (b) env keys validated and typed, (c) no secret literal committed.
- **CLI(s)**: `npm install passport-github2`; `npm install -D @types/passport-github2`; `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `@nestjs/passport`, `passport`, `passport-oauth2` already installed; newly install `passport-github2` (runtime) and `@types/passport-github2` (dev) in root `package.json`.
- **File(s)/Folder(s)**:
  - **Added**: `None`
  - **Modified**: `src/common/config/validation/env.validation.ts`, `src/common/config/oauth.config.ts`, `src/common/config/oauth.config.spec.ts`, `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `feat/auth-oauth-github` (shared with `P06-05b`, `P06-05c`)
- **Commit**: `feat(config): add github oauth2 strategy package and env keys`
- **Testing**: Unit spec asserts the three GitHub keys are typed and required in production; a secret-absence negative spec asserts Joi fails fast; coverage thresholds pass.

### `P06-05b` — Implement the thin GitHub provider adapter
- **Description**: Add `GitHubOAuth2Adapter` implementing `OAuth2ProviderPort`, configuring the shared factory with GitHub's authorize/token endpoints and mapping GitHub's profile (`id` → string `sub`, `email`, `displayName`/`username`). Because GitHub may omit an explicit verified flag, the adapter must pass email as unverified unless an explicit verified-email source is present, so unverified emails never merge. Atomic checks: (a) adapter implements the port, (b) mapping delegates to normalizer, (c) missing verified flag → `emailVerified: false`.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `P06-05a` package and `P06 Step 1` shared components.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/adapters/oauth2/providers/github-oauth2.adapter.ts`, `src/modules/auth/adapters/oauth2/providers/github-oauth2.adapter.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/auth-oauth-github` (shared)
- **Commit**: `feat(auth): add thin github oauth2 provider adapter`
- **Testing**: Unit spec with a faker GitHub profile asserts numeric `id` becomes a string `sub` and email is lowercased via the normalizer; negative spec asserts no verified claim → `emailVerified: false`; coverage thresholds pass.

### `P06-05c` — Register GitHub and cover the callback with mocked responses
- **Description**: Register `GitHubOAuth2Adapter` in `auth.module.ts` and add `test/oauth-github.e2e-spec.ts` with `vi.fn()` mocked GitHub token/profile responses. Cover happy path, unverified-email no-merge (critical for GitHub), repeat-callback idempotency and no-duplicate-user assertions. Atomic checks: (a) strategy registered, (b) E2E happy + negative paths, (c) one user per email.
- **CLI(s)**: `npm run test:e2e -- oauth-github`; `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `test/oauth-github.e2e-spec.ts`
  - **Modified**: `src/modules/auth/auth.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-oauth-github` (shared)
- **Commit**: `test(auth): register github oauth2 and cover callback with mocked responses`
- **Testing**: E2E with `vi.fn()` mocked GitHub responses asserts token issuance and that an unverified email never merges or duplicates; repeat-callback idempotency asserted; coverage thresholds pass.

### `P06-06a` — Add Apple strategy package and validated env keys
- **Description**: Install an Apple OAuth2 Passport strategy package and extend the Joi env schema and `oauth.config.ts` with `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY_PATH` and `APPLE_CALLBACK_URL`. Apple requires a signed client secret JWT built from team/key/private-key — generate it in config from validated env values, never commit the private key or a prebuilt secret. Depends on `P06-01d`. Atomic checks: (a) package installed, (b) Apple keys validated and typed, (c) no private key or secret literal committed.
- **CLI(s)**: `npm install passport-apple`; `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `@nestjs/passport`, `passport`, `passport-oauth2` already installed; newly install `passport-apple` (runtime) in root `package.json`.
- **File(s)/Folder(s)**:
  - **Added**: `None`
  - **Modified**: `src/common/config/validation/env.validation.ts`, `src/common/config/oauth.config.ts`, `src/common/config/oauth.config.spec.ts`, `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `feat/auth-oauth-apple` (shared with `P06-06b`, `P06-06c`)
- **Commit**: `feat(config): add apple oauth2 strategy package and env keys`
- **Testing**: Unit spec asserts Apple keys are typed and required in production and that the client-secret JWT is generated from env values (mocked signer via `vi.fn()`); negative spec asserts missing private key fails fast; coverage thresholds pass.

### `P06-06b` — Implement the thin Apple provider adapter
- **Description**: Add `AppleOAuth2Adapter` implementing `OAuth2ProviderPort`, configuring the shared factory for Apple's authorize/token endpoints (including `form_post` response mode and the generated client secret). Map Apple's `sub` claim and `email`/`emailVerified` (Apple supplies a verified-email claim) into `StandardProfile` through the shared normalizer. Note that Apple returns the profile in the token's `id_token`, so the adapter parses it before delegating; still no duplicate mapping logic. Atomic checks: (a) adapter implements the port, (b) `sub` and verified email mapped via normalizer, (c) Apple-specific client secret used, not a committed literal.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `P06-06a` package and `P06 Step 1` shared components.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/adapters/oauth2/providers/apple-oauth2.adapter.ts`, `src/modules/auth/adapters/oauth2/providers/apple-oauth2.adapter.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/auth-oauth-apple` (shared)
- **Commit**: `feat(auth): add thin apple oauth2 provider adapter`
- **Testing**: Unit spec with a faker Apple `id_token` payload asserts `sub` becomes identity, verified email is lowercased and `emailVerified: true`, and the normalizer is called once; negative spec asserts an unverified email yields `emailVerified: false`; coverage thresholds pass.

### `P06-06c` — Register Apple and cover the callback with mocked responses
- **Description**: Register `AppleOAuth2Adapter` in `auth.module.ts` and add `test/oauth-apple.e2e-spec.ts` with `vi.fn()` mocked Apple token/`id_token` responses. Cover happy path, unverified-email no-merge, repeat-callback idempotency and no-duplicate-user assertions, plus the `form_post` callback shape. Atomic checks: (a) strategy registered, (b) E2E happy + negative paths including `form_post`, (c) one user per email.
- **CLI(s)**: `npm run test:e2e -- oauth-apple`; `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `test/oauth-apple.e2e-spec.ts`
  - **Modified**: `src/modules/auth/auth.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-oauth-apple` (shared)
- **Commit**: `test(auth): register apple oauth2 and cover callback with mocked responses`
- **Testing**: E2E with `vi.fn()` mocked Apple responses asserts token issuance and verified-email merge; negative specs cover unverified email and duplicate email producing no extra rows; `form_post` callback body accepted; coverage thresholds pass.

### `P06-07a` — Add X OAuth2 config and validated env keys
- **Description**: Extend the Joi env schema and `oauth.config.ts` with `X_CLIENT_ID`, `X_CLIENT_SECRET`, `X_CALLBACK_URL` and a `X_USE_PKCE` flag. X's OAuth 2.0 flow is served by the existing generic `passport-oauth2` base (`P06-01b`), so no new strategy package is required — only typed, validated config and a PKCE toggle. No secrets committed. Depends on `P06-01d`. Atomic checks: (a) X keys validated and typed, (b) PKCE flag typed, (c) no secret literal committed.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `passport-oauth2` installed by `P06-01b`; only env keys are added.
- **File(s)/Folder(s)**:
  - **Added**: `None`
  - **Modified**: `src/common/config/validation/env.validation.ts`, `src/common/config/oauth.config.ts`, `src/common/config/oauth.config.spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-oauth-x` (shared with `P06-07b`, `P06-07c`)
- **Commit**: `feat(config): add x oauth2 env keys and validated config`
- **Testing**: Unit spec asserts X keys and PKCE flag are typed and required in production; a secret-absence negative spec asserts Joi fails fast; coverage thresholds pass.

### `P06-07b` — Implement the thin X provider adapter
- **Description**: Add `XOAuth2Adapter` implementing `OAuth2ProviderPort`, configuring the generic factory (`P06-01b`) with X's authorize/token endpoints and PKCE enabled from config. Map X's profile (`id`/`sub`, `email` if available, `verified`, `name`/`username`) into `StandardProfile` through the shared normalizer. X may omit email and verified flag, so the adapter must fail closed — an absent/unverified email never merges and is linked only by `sub`. Atomic checks: (a) adapter implements the port, (b) PKCE enabled from config, (c) absent/unverified email → `emailVerified: false`.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses the generic `passport-oauth2` base from `P06-01b` and shared normalizer from `P06-01c`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/adapters/oauth2/providers/x-oauth2.adapter.ts`, `src/modules/auth/adapters/oauth2/providers/x-oauth2.adapter.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/auth-oauth-x` (shared)
- **Commit**: `feat(auth): add thin x oauth2 provider adapter`
- **Testing**: Unit spec with a faker X profile asserts numeric `id` becomes a string `sub` and email is lowercased via the normalizer; negative specs assert missing email and absent verified flag yield `emailVerified: false`; PKCE config assertion present; coverage thresholds pass.

### `P06-07c` — Register X and cover the callback with mocked responses
- **Description**: Register `XOAuth2Adapter` in `auth.module.ts` and add `test/oauth-x.e2e-spec.ts` with `vi.fn()` mocked X token/profile responses. Cover happy path, unverified/absent-email no-merge, repeat-callback idempotency and no-duplicate-user assertions, plus a PKCE-enabled flow assertion. Atomic checks: (a) strategy registered, (b) E2E happy + negative paths including PKCE, (c) one user per email.
- **CLI(s)**: `npm run test:e2e -- oauth-x`; `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `test/oauth-x.e2e-spec.ts`
  - **Modified**: `src/modules/auth/auth.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-oauth-x` (shared)
- **Commit**: `test(auth): register x oauth2 and cover callback with mocked responses`
- **Testing**: E2E with `vi.fn()` mocked X responses asserts token issuance and that an absent/unverified email never merges or duplicates; PKCE-enabled flow asserted; repeat-callback idempotency asserted; coverage thresholds pass.

## Phase Gate (end of step)

- [ ] Full unit tests + coverage thresholds pass.
- [ ] E2E passes for all five providers with mocked provider responses, including unverified-email, duplicate-email and idempotency negative paths.
- [ ] Every adapter remains thin: one generic factory, one normalizer, no duplicated merge or mapping logic; no duplicate users per email.
- [ ] Security audit & version sync pass; no client secrets, private keys or PII committed.
- [ ] Each atomic commit pushed on its shared branch; PR merged into `dev` in this exact order:
  `P06-03a` → `P06-03b` → `P06-03c` → `P06-04a` → `P06-04b` → `P06-04c` → `P06-05a` → `P06-05b` → `P06-05c` → `P06-06a` → `P06-06b` → `P06-06c` → `P06-07a` → `P06-07b` → `P06-07c`.
- [ ] Status for umbrella IDs `P06-03`, `P06-04`, `P06-05`, `P06-06`, `P06-07` set to `✅ Done` in [`roadmap.md`](../../../roadmap.md) §4 (atomic IDs tracked here).
- [ ] Re-check the P06 exit criterion in [`roadmap.md`](../../../roadmap.md) §6.1 before starting the next step.
