# P01 · Step 3 — API Docs & Project Policies

**Project:** nestjs-ddd  |  **Phase:** P01 — Foundation  |  **Base branch:** `dev`  |  **Status:** ⬜ Planned

> Source of truth: [`roadmap.md`](../../../roadmap.md) §4. Umbrella IDs `P01-08`, `P01-09`, `P01-10` stay in the roadmap; this file lists the final atomic split (`P01-08a` … `P01-10e`).
> **Format**: `P<phase>-<umbrella><letter>` — one atomic task = one commit; sibling atomic tasks share one branch (branch per umbrella task). Every atomic task uses the 7-field format: `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing`.
> **Ordering notes**: (a) `P01-08a` creates `setupOpenApi(app)` and calls it immediately **above** `app.useSecurityHeaders()` from `P01-07`; `P01-08b`/`P01-08c` extend the same function, preserving that call order. (b) `P01-09a` promotes `@faker-js/faker` from devDependency to dependency because `src/` decorator metadata imports it at runtime. (c) `P01-10a` reads the version from `package.json` so the badge never drifts.

## DDD + SOLID lens for this step

- Use NestJS 12 first-party APIs over hand-rolled infrastructure.
- Config is small, typed and exported as `as Provider()` for async module options.
- No business rules in config, CI or docs; no secrets or PII committed.
- Tests use Vitest with `vi.fn()` mocks and faker fixtures.

## Step Summary

Mount two OpenAPI documents (user + admin) with a bearer scheme and a Scalar UI, keep admin docs out of production, feed deterministic faker-backed examples into Swagger decorators, and add the repository's governing documents with a link check.

## Atomic Tasks

### `P01-08a` — Create setupOpenApi with the user document and bearer scheme
- **Description**: Create `src/common/config/openapi/setup-openapi.ts` exporting `setupOpenApi(app: INestApplication)`. Register the `user` document at `docs` / `docs-json` with `DocumentBuilder` metadata (title `nestjs-ddd API`, version read from `package.json`, description) and a bearer `Authorization` security scheme (`type: 'http'`, `scheme: 'bearer'`, `bearerFormat: 'JWT'`). Filter the document to non-`admin` tags. Call `setupOpenApi(app)` in `src/main.ts` on the line immediately **above** `app.useSecurityHeaders()` added by `P01-07`; this ordering is a hard requirement. Atomic checks: (a) separate file exports the function, (b) `docs-json` contains the bearer scheme and no admin tags, (c) `main.ts` call order is `setupOpenApi` → `useSecurityHeaders`.
- **CLI(s)**: `npm install @nestjs/swagger`; `mkdir -p src/common/config/openapi`; `npm run test:e2e -- openapi`; `npm run typecheck`.
- **Package(s)**: installed with `npm install @nestjs/swagger` (first-party Nest package, reused by `P01-09` and later user/admin DTOs).
- **File(s)/Folder(s)**:
  - **Added**: `src/common/config/openapi/setup-openapi.ts`, `src/common/config/openapi/setup-openapi.spec.ts`, `test/openapi.e2e-spec.ts`
  - **Modified**: `src/main.ts`, `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `feat/api-openapi-scalar` (shared with `P01-08b` … `P01-08d`)
- **Commit**: `feat(api): add openapi user document with bearer scheme`
- **Testing**: Unit spec asserting `setupOpenApi` registers exactly one document and the bearer scheme object; E2E `GET /docs-json` asserts the scheme, title, version and absence of admin-tagged paths; E2E asserts `/docs` returns HTML; add a regression assertion that the docs route still responds with headers applied.

### `P01-08b` — Add the admin document with a production guard
- **Description**: Extend `setupOpenApi` with a second document named `admin` served at `admin/docs` / `admin/docs-json`, filtered to `admin`-tagged routes only. Read `nodeEnv` from the typed app config slice (`P01-04`/`P01-05`) and register the admin document only when `nodeEnv !== 'production'`; in production the route must not exist at all (404), not merely return an empty spec. The user document stays available in every environment. Atomic checks: (a) two documents with disjoint tag filters, (b) admin 404 under `NODE_ENV=production`, (c) user doc unchanged in both environments.
- **CLI(s)**: `NODE_ENV=development npm run test:e2e -- openapi`; `NODE_ENV=production npm run test:e2e -- openapi`; `npm run test:unit`.
- **Package(s)**: `None` — reuses `@nestjs/swagger` from `P01-08a`.
- **File(s)/Folder(s)**:
  - **Added**: `None`
  - **Modified**: `src/common/config/openapi/setup-openapi.ts`, `src/common/config/openapi/setup-openapi.spec.ts`, `test/openapi.e2e-spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/api-openapi-scalar` (shared)
- **Commit**: `feat(api): add admin openapi document with production guard`
- **Testing**: Unit spec with `vi.fn()` on the config value covering both env branches; E2E in dev asserts both documents and correct tag partitions; E2E with `NODE_ENV=production` asserts 404 on both admin routes and 200 on user routes.

### `P01-08c` — Mount the Scalar API Reference UI
- **Description**: Install `@scalar/nestjs-api-reference` and mount its middleware for the `user` document, pointing at `/docs-json`. Apply the same `nodeEnv !== 'production'` guard so no admin Scalar UI is exposed. Keep the mount inside `setupOpenApi` so the call order relative to `useSecurityHeaders()` remains `P01-08a`'s single insertion point. Atomic checks: (a) Scalar route registered, (b) returned HTML references the user spec URL, (c) no admin Scalar route in production.
- **CLI(s)**: `npm install @scalar/nestjs-api-reference`; `npm run test:e2e -- scalar`; `npm run typecheck`.
- **Package(s)**: installed with `npm install @scalar/nestjs-api-reference`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/config/openapi/scalar-api-reference.ts`, `test/scalar-api-reference.e2e-spec.ts`
  - **Modified**: `src/common/config/openapi/setup-openapi.ts`, `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `feat/api-openapi-scalar` (shared)
- **Commit**: `feat(api): mount scalar api reference for user document`
- **Testing**: E2E `GET /reference` returns HTML containing `/docs-json` and not `/admin/docs-json`; E2E under production env asserts the admin Scalar route is absent; unit spec for the guard predicate.

### `P01-08d` — Add end-to-end coverage for documentation routes
- **Description**: Consolidate the documentation E2E suite covering: user spec + Scalar in development, admin spec + admin Scalar in development, admin routes 404 in production, bearer scheme present in both specs, and tag partitions correct. Add an assertion that `setupOpenApi` runs before security headers by checking the docs response still carries the hardened headers from `P01-07`. Atomic checks: (a) all six scenarios present, (b) no real credentials or PII in any fixture, (c) suite passes in both env modes.
- **CLI(s)**: `npm run test:e2e -- openapi scalar`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `test/openapi-production.e2e-spec.ts`
  - **Modified**: `test/openapi.e2e-spec.ts`, `test/scalar-api-reference.e2e-spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/api-openapi-scalar` (shared)
- **Commit**: `test(api): cover openapi and scalar routes across environments`
- **Testing**: Full E2E suite in dev and prod-like env; coverage thresholds unchanged; fixtures created via seeded faker factories from `P01-03`.

### `P01-09a` — Create the seeded faker example factory
- **Description**: Add `src/common/fixtures/swagger-examples.ts` exporting `createSwaggerExamples()` built on `@faker-js/faker` with a fixed `faker.seed()` call so examples are deterministic across runs. Keep the file under `src/` (never import from `test/`) so production builds do not pull test helpers into decorator metadata. Promote `@faker-js/faker` from `devDependencies` to `dependencies` because `src/` decorators will import these values at runtime. Atomic checks: (a) seeded factory exists, (b) two calls produce identical output, (c) faker is in `dependencies`.
- **CLI(s)**: `npm pkg delete devDependencies.@faker-js/faker`; `npm install @faker-js/faker`; `npm run test:unit`.
- **Package(s)**: `@faker-js/faker` moved from devDependency (installed by `P01-03`) to dependency.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/fixtures/swagger-examples.ts`, `src/common/fixtures/swagger-examples.spec.ts`
  - **Modified**: `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `feat/api-swagger-faker-examples` (shared with `P01-09b` … `P01-09c`)
- **Commit**: `feat(api): add seeded faker example factory for swagger`
- **Testing**: Unit spec asserting deterministic output for a fixed seed and that no value contains obvious sensitive data; `npm run typecheck`.

### `P01-09b` — Decorate the example DTO with API property examples
- **Description**: Import `createSwaggerExamples()` into `src/common/dto/example.dto.ts` (created by `P01-02`) and add `@ApiProperty({ example })` to each property, using the generated values. Add `@ApiProperty({ example, description })` for the `id` and timestamp fields as well. Do not hand-write example literals. Atomic checks: (a) every DTO property has an example, (b) examples come from the factory, (c) no literal sensitive values.
- **CLI(s)**: `npm run test:unit`; `NODE_ENV=development npm run test:e2e -- openapi`.
- **Package(s)**: `None` — reuses `@nestjs/swagger` and faker factory.
- **File(s)/Folder(s)**:
  - **Added**: `None`
  - **Modified**: `src/common/dto/example.dto.ts`
  - **Deleted**: `None`
- **Branch**: `feat/api-swagger-faker-examples` (shared)
- **Commit**: `feat(api): decorate example dto with faker-backed swagger examples`
- **Testing**: Unit spec validating each example against the DTO via `class-validator`; E2E asserts `docs-json` contains the examples.

### `P01-09c` — Validate example determinism and schema conformance
- **Description**: Add a spec that calls `createSwaggerExamples()` twice with the same seed and asserts deep equality, then validates every generated example against its DTO class with `validateSync()`. Add an assertion that the generated `docs-json` spec embeds the same examples. Atomic checks: (a) determinism, (b) schema conformance, (c) spec embedding.
- **CLI(s)**: `npm run test:unit`; `npm run test:e2e -- openapi`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `None`
  - **Modified**: `src/common/fixtures/swagger-examples.spec.ts`, `test/openapi.e2e-spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/api-swagger-faker-examples` (shared)
- **Commit**: `test(api): assert swagger examples are deterministic and schema-valid`
- **Testing**: Specs listed above; coverage thresholds pass.

### `P01-10a` — Add README with quick start and architecture overview
- **Description**: Create `README.md` with: project name and one-line purpose, a version badge whose value is read from `package.json` (and a note to keep them in sync), prerequisites (Node LTS, Docker optional), install/run/test commands, a short directory map of `src/modules` and `src/common`, links to `SECURITY.md` and `CHANGELOG.md`, and the compliance targets. Atomic checks: (a) badge matches `package.json`, (b) all commands actually exist in `package.json` scripts, (c) no real secrets in examples.
- **CLI(s)**: `npm run` (to list scripts before documenting); markdown link check via `npm run docs:check` added in `P01-10e`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `README.md`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `docs/project-policies` (shared with `P01-10b` … `P01-10e`)
- **Commit**: `docs(project): add readme with quick start and architecture map`
- **Testing**: Link check in `P01-10e`; manual verification that documented commands exist.

### `P01-10b` — Add LICENSE
- **Description**: Add a `LICENSE` file with the MIT license text, copyright holder `xVnDev` and year `2026`. Ensure the README links to it. Atomic checks: (a) standard MIT text present, (b) correct holder/year, (c) README link resolves.
- **CLI(s)**: `None`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `LICENSE`
  - **Modified**: `README.md` (license section/link)
  - **Deleted**: `None`
- **Branch**: `docs/project-policies` (shared)
- **Commit**: `docs(project): add mit license file`
- **Testing**: Link check; no test code.

### `P01-10c` — Add SECURITY.md policy
- **Description**: Create `SECURITY.md` covering: supported versions table, how to report a vulnerability (private channel, no public issues), expected response timeline, disclosure policy, dependency update cadence, and a note that the target controls are ISO 27001:2022 / OWASP ASVS 4.0 L2 / HIPAA §164.312 / GDPR Art. 32. Include a rule that CI security thresholds may only be suppressed with documented approval. Atomic checks: (a) all sections present, (b) no real contact secrets (use a security@ address placeholder), (c) README links to it.
- **CLI(s)**: `None`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `SECURITY.md`
  - **Modified**: `README.md` (security link)
  - **Deleted**: `None`
- **Branch**: `docs/project-policies` (shared)
- **Commit**: `docs(project): add security policy and disclosure process`
- **Testing**: Link check; manual review against the compliance targets in roadmap §11.

### `P01-10d` — Add CHANGELOG.md
- **Description**: Create `CHANGELOG.md` following Keep a Changelog with an `Unreleased` section and the initial `1.0.0-rc.0` entry mirroring the `package.json` version set in `P01-10a` (no tag yet — tagging is `P09-10`). Group entries under Added/Changed/Security. Atomic checks: (a) Keep a Changelog structure, (b) version matches package.json, (c) README link resolves.
- **CLI(s)**: `npm pkg get version`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `CHANGELOG.md`
  - **Modified**: `README.md` (changelog link)
  - **Deleted**: `None`
- **Branch**: `docs/project-policies` (shared)
- **Commit**: `docs(project): add changelog with unreleased section`
- **Testing**: Version consistency check; link check.

### `P01-10e` — Add and run the markdown link check script
- **Description**: Add a `docs:check` npm script that verifies all relative links in `README.md`, `SECURITY.md`, `CHANGELOG.md`, `LICENSE` references and the `.opencode/plans/**` tree resolve to existing files. Use a small Node script under `scripts/check-links.mjs` with no new dependencies. Run it and fix any broken links found. Atomic checks: (a) script exists and is wired in `package.json`, (b) it fails on a deliberately broken link (self-test), (c) it passes on the current tree.
- **CLI(s)**: `npm pkg set scripts.docs:check="node scripts/check-links.mjs"`; `npm run docs:check`; self-test by temporarily inserting a broken link.
- **Package(s)**: `None` — Node built-ins only (`node:fs`, `node:path`).
- **File(s)/Folder(s)**:
  - **Added**: `scripts/check-links.mjs`, `scripts/check-links.spec.ts`
  - **Modified**: `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `docs/project-policies` (shared)
- **Commit**: `chore(docs): add markdown link check script`
- **Testing**: Unit spec for the link extractor using `vi.fn()` on `fs` where needed; negative self-test proves the checker fails on a broken link; final `npm run docs:check` passes.

## Phase Gate (end of step)

- [ ] Full unit tests + coverage thresholds pass.
- [ ] E2E passes for user/admin OpenAPI docs, Scalar UI, production guard and header ordering.
- [ ] Security audit & version sync pass.
- [ ] Each atomic commit pushed on its shared branch; PR merged into `dev` in this exact order:
  `P01-08a` → `P01-08b` → `P01-08c` → `P01-08d` → `P01-09a` → `P01-09b` → `P01-09c` → `P01-10a` → `P01-10b` → `P01-10c` → `P01-10d` → `P01-10e`.
- [ ] Status for umbrella IDs `P01-08`, `P01-09`, `P01-10` set to `✅ Done` in [`roadmap.md`](../../../roadmap.md) §4 (atomic IDs tracked here).
- [ ] Re-check the P01 exit criterion in [`roadmap.md`](../../../roadmap.md) §6.1 before starting the next step.
