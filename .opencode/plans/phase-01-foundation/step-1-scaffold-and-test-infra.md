# P01 · Step 1 — NestJS 12 Scaffold & Test Infrastructure

**Project:** nestjs-ddd  |  **Phase:** P01 — Foundation  |  **Base branch:** `dev`  |  **Status:** ⬜ Planned

> Source of truth: [`roadmap.md`](../../../roadmap.md) §4. Umbrella IDs `P01-01`, `P01-02`, `P01-03` stay in the roadmap; this file lists the final atomic split (`P01-01a` … `P01-03c`).
> **Format**: `P<phase>-<umbrella><letter>` — one atomic task = one commit; sibling atomic tasks share one branch (branch per umbrella task). Every atomic task uses the 7-field format: `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing`.
> **Ordering notes**: (a) `P01-01a` installs runtime deps and `package.json`, `P01-01b`/`P01-01c` layer strict TS and lint/format on top, `P01-01d` builds the health module, and `P01-01e` wires the bootstrap that registers it — do not reorder. (b) `P01-02a` creates the Vitest projects after a bootable app exists (`P01-01e`), because its sample E2E spec boots `AppModule`. (c) `P01-03a` installs faker as a **devDependency**; `P01-09a` later promotes it to a dependency because `src/` Swagger decorators import it at runtime. (d) The sample DTO created in `P01-05a` is decorated with faker examples in `P01-09b`.

## DDD + SOLID lens for this step

- Use NestJS 12 first-party APIs over hand-rolled infrastructure.
- Config is small, typed and exported as `as Provider()` for async module options.
- No business rules in config, CI or docs; no secrets or PII committed.
- Tests use Vitest with `vi.fn()` mocks and faker fixtures.

## Step Summary

Bootstrap a NestJS 12 application in strict TypeScript with Oxlint/Prettier/EditorConfig and a minimal health endpoint, add Vitest unit/E2E projects with enforced coverage thresholds wired into CI, then provide seeded faker-backed fixture factories shared by unit tests, E2E tests and later OpenAPI examples. No ports are introduced here — the health check is a plain controller, per the "no DDD theatre" guardrail.

## Atomic Tasks

### `P01-01a` — Install NestJS 12 runtime dependencies and base package scripts
- **Description**: Create the root `package.json` with project name `nestjs-ddd`, private mode and the first npm scripts (`build`, `start`, `start:dev`, `start:prod`), then install the first-party NestJS 12 runtime stack and its required peer dependencies. Pin to the `^12` line for `@nestjs/*` packages so later phases consume native APIs only. Add no security or config packages here — those arrive in Steps 2–3. Atomic checks: (a) `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` at v12 in `dependencies`, (b) `reflect-metadata` and `rxjs` present, (c) `package-lock.json` committed. This is the prerequisite for every other `P01-01` atomic.
- **CLI(s)**: `npm init -y`; `npm pkg set name=nestjs-ddd private=true`; `npm install @nestjs/common@^12 @nestjs/core@^12 @nestjs/platform-express@^12 reflect-metadata rxjs`; `npm pkg set scripts.build="nest build" scripts.start="nest start" scripts.start:dev="nest start --watch" scripts.start:prod="node dist/main" scripts.plans:check="node scripts/check-plan-links.mjs"`.
- **Package(s)**: installed as `dependencies`: `@nestjs/common@^12`, `@nestjs/core@^12`, `@nestjs/platform-express@^12`, `reflect-metadata`, `rxjs`.
- **File(s)/Folder(s)**:
  - **Added**: `package.json`, `package-lock.json`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `chore/core-scaffold-nestjs12` (shared with `P01-01b` … `P01-01e`)
- **Commit**: `chore(core): install nestjs 12 runtime dependencies and base scripts`
- **Testing**: `npm ls @nestjs/core --depth=0` confirms v12; `npm run build` is expected to fail until `P01-01b`/`P01-01e` land (no source yet). No spec file in this atomic.

### `P01-01b` — Add strict TypeScript and Nest CLI configuration
- **Description**: Install TypeScript and Node type definitions as devDependencies, then add `tsconfig.json` with `strict: true`, `strictNullChecks`, `noImplicitAny`, `esModuleInterop`, `experimentalDecorators`, `emitDecoratorMetadata` and path-safe `baseUrl: "./"`, plus `tsconfig.build.json` excluding specs and `nest-cli.json` pointing at `src` with `sourceRoot`. Add a `typecheck` npm script (`tsc --noEmit -p tsconfig.json`). No business rules or env values belong in these files. Atomic checks: (a) `strict: true` present, (b) decorator metadata enabled, (c) `npm run typecheck` exits zero on the empty source tree. Follows `P01-01a`.
- **CLI(s)**: `npm install -D typescript @types/node`; `npm pkg set scripts.typecheck="tsc --noEmit -p tsconfig.json"`; `npm run typecheck`.
- **Package(s)**: installed as `devDependencies`: `typescript`, `@types/node`.
- **File(s)/Folder(s)**:
  - **Added**: `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`
  - **Modified**: `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `chore/core-scaffold-nestjs12` (shared)
- **Commit**: `chore(core): add strict typescript and nest cli configuration`
- **Testing**: `npm run typecheck` passes with zero errors; a temporary `any`-typed probe must be rejected (self-test, not committed). No spec file.

### `P01-01c` — Add Oxlint, Prettier and EditorConfig
- **Description**: Install Oxlint (plus `oxlint-tsgolint` for the type-aware rules used by the CLI's `--type-aware` flag) as devDependencies, then add an Oxlint config (`.oxlintrc.json` or the `oxlint` key in `package.json`), `.prettierrc`, `.prettierignore` and `.editorconfig` (UTF-8, LF, 2-space indent, final newline) so the whole team and CI lint/format identically. Prettier stays the formatter. Wire `lint`, `lint:fix`, `format` and `format:check` npm scripts matching the NestJS CLI init output (`"lint": "oxlint --type-aware src/ test/"`). Do not encode business rules in lint rules — style only. Atomic checks: (a) Oxlint config + Prettier + EditorConfig present, (b) Oxlint parses TypeScript decorators under `--type-aware`, (c) `npm run lint` and `npm run format:check` exit zero. Follows `P01-01b`.
- **CLI(s)**: `npm install -D oxlint oxlint-tsgolint prettier`; `npm pkg set scripts.lint="oxlint --type-aware src/ test/" scripts.lint:fix="oxlint --fix --type-aware src/ test/" scripts.format="prettier --write \"src/**/*.ts\" \"test/**/*.ts\"" scripts.format:check="prettier --check \"src/**/*.ts\" \"test/**/*.ts\""`; `npm run lint`; `npm run format:check`.
- **Package(s)**: installed as `devDependencies`: `oxlint`, `oxlint-tsgolint`, `prettier`.
- **File(s)/Folder(s)**:
  - **Added**: `.oxlintrc.json`, `.prettierrc`, `.prettierignore`, `.editorconfig`
  - **Modified**: `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `chore/core-scaffold-nestjs12` (shared)
- **Commit**: `chore(core): add oxlint prettier and editorconfig`
- **Testing**: `npm run lint` and `npm run format:check` pass on the current tree; a deliberately misformatted probe must fail `format:check` (self-test, not committed). No spec file.

### `P01-01d` — Create the health bounded-context module and controller
- **Description**: Create a minimal `health` context with `src/modules/health/health.module.ts` and a thin controller at `src/modules/health/interfaces/health.controller.ts` exposing `GET /health` that returns `{ status: 'ok' }` with no domain or persistence logic. Add a unit spec for the controller using `vi.fn()` only if a collaborator appears; the current handler is pure, so assert the returned literal and decorator metadata. Place the controller under `interfaces/` so the context shape (`domain/`, `application/`, `infrastructure/`, `interfaces/`) is anticipatory without inventing empty layers. Atomic checks: (a) module + controller exist under `src/modules/health/`, (b) route returns 200-shaped payload, (c) no business rule in the controller. Follows `P01-01c`.
- **CLI(s)**: `mkdir -p src/modules/health/interfaces`; `npm run test:unit` (script wired in `P01-02b`; use `npx vitest run` before then).
- **Package(s)**: `None` — reuses `@nestjs/common` from `P01-01a` and Vitest from `P01-02a`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/health/health.module.ts`, `src/modules/health/interfaces/health.controller.ts`, `src/modules/health/interfaces/health.controller.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `chore/core-scaffold-nestjs12` (shared)
- **Commit**: `feat(health): add health module and thin interfaces controller`
- **Testing**: `src/modules/health/interfaces/health.controller.spec.ts` asserts the handler returns `{ status: 'ok' }` and that no collaborator is called; no mock needed yet, so no `vi.fn()` required in this spec. Coverage thresholds from `P01-02d` apply once wired.

### `P01-01e` — Wire the root AppModule and bootstrap with a health smoke E2E
- **Description**: Create `src/app.module.ts` importing `HealthModule` and `src/main.ts` that calls `NestFactory.create(AppModule)` then `app.listen(process.env.PORT ?? 3000)`. Do **not** add pipes, logger, headers or docs here — those are Steps 2–3 and `main.ts` is the shared insertion point for them. Add `test/health.e2e-spec.ts` booting the real app with Supertest and asserting `GET /health` returns 200 and the expected body. Atomic checks: (a) `AppModule` imports `HealthModule`, (b) app boots and listens, (c) E2E smoke passes. Follows `P01-01d` and is the prerequisite for `P01-02a`'s sample E2E spec.
- **CLI(s)**: `npm run start:dev`; `npm run test:e2e -- health` (scripts wired in `P01-02b`; use `npx vitest run --config vitest.e2e.config.ts health` before then).
- **Package(s)**: `None` — reuses `@nestjs/core`, `@nestjs/platform-express` from `P01-01a` and Supertest from `P01-02a`.
- **File(s)/Folder(s)**:
  - **Added**: `src/app.module.ts`, `src/main.ts`, `test/health.e2e-spec.ts`
  - **Modified**: `package.json` (final `start`/`start:prod` paths)
  - **Deleted**: `None`
- **Branch**: `chore/core-scaffold-nestjs12` (shared)
- **Commit**: `feat(core): add app module bootstrap and health smoke e2e`
- **Testing**: `test/health.e2e-spec.ts` creates a `Test.createTestingModule({ imports: [AppModule] })`, applies `app.getHttpServer()` to Supertest, and asserts status 200 plus `{ status: 'ok' }`; no `vi.fn()` needed. `npm run typecheck` passes.

### `P01-02a` — Install Vitest, Supertest and coverage provider with unit/E2E projects
- **Description**: Install Vitest, its V8 coverage provider and Supertest as devDependencies, then add three config files: a root `vitest.config.ts` with shared aliases and coverage settings, `vitest.unit.config.ts` including `src/**/*.spec.ts`, and `vitest.e2e.config.ts` including `test/**/*.e2e-spec.ts` with a longer test timeout and the global setup file. Keep coverage provider and reporters identical across projects so CI output is comparable. Atomic checks: (a) three configs exist, (b) unit and E2E include globs are disjoint, (c) `npx vitest run --config vitest.unit.config.ts` and the E2E config both exit zero. Follows `P01-01e` because the sample E2E spec boots `AppModule`.
- **CLI(s)**: `npm install -D vitest @vitest/coverage-v8 supertest @types/supertest`; `npx vitest run --config vitest.unit.config.ts`; `npx vitest run --config vitest.e2e.config.ts`.
- **Package(s)**: installed as `devDependencies`: `vitest`, `@vitest/coverage-v8`, `supertest`, `@types/supertest`.
- **File(s)/Folder(s)**:
  - **Added**: `vitest.config.ts`, `vitest.unit.config.ts`, `vitest.e2e.config.ts`, `test/setup-e2e.ts`
  - **Modified**: `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `chore/test-vitest-setup` (shared with `P01-02b` … `P01-02d`)
- **Commit**: `chore(test): add vitest unit and e2e projects with coverage provider`
- **Testing**: The existing `src/modules/health/interfaces/health.controller.spec.ts` and `test/health.e2e-spec.ts` are the proof specs for each project; both must pass under their respective configs.

### `P01-02b` — Wire npm test scripts and the CI test job
- **Description**: Add `test`, `test:unit`, `test:e2e`, `test:cov`, `test:watch` npm scripts pointing at the configs from `P01-02a`, and add `.github/workflows/test.yml` on `ubuntu-latest` (checkout `actions/checkout@v6`, setup-node `actions/setup-node@v7` with `node-version: 'lts/*'`) running lint, typecheck, unit with coverage and E2E on pushes/PRs to `dev`. Use the exact commands developers run locally so CI cannot drift; no secrets or deploy credentials in this workflow. Atomic checks: (a) all five scripts exist in `package.json`, (b) CI job references them verbatim, (c) workflow has no secrets. Follows `P01-02a`.
- **CLI(s)**: `npm pkg set scripts.test="vitest run" scripts.test:unit="vitest run --config vitest.unit.config.ts" scripts.test:e2e="vitest run --config vitest.e2e.config.ts" scripts.test:cov="vitest run --config vitest.unit.config.ts --coverage" scripts.test:watch="vitest --config vitest.unit.config.ts"`; `npm run test:unit`; `npm run test:e2e`.
- **Package(s)**: `None` — reuses Vitest tooling from `P01-02a`.
- **File(s)/Folder(s)**:
  - **Added**: `.github/workflows/test.yml`
  - **Modified**: `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `chore/test-vitest-setup` (shared)
- **Commit**: `chore(test): wire vitest npm scripts and ci test job`
- **Testing**: `npm run test:unit` and `npm run test:e2e` both green; CI YAML parsed by the workflow linter; `npm run lint` clean on the new workflow-adjacent files.

### `P01-02c` — Add sample specs proving both test projects run
- **Description**: Add `src/modules/health/health.module.spec.ts` that compiles `HealthModule` in a `Test.createTestingModule()` and asserts the controller is resolvable, and extend `test/health.e2e-spec.ts` with a negative case (unknown route → 404) to exercise Supertest's failure path. These are smoke specs for the infrastructure, not business tests; use `vi.fn()` only if a provider is mocked (none here). Atomic checks: (a) one new unit spec under `src/`, (b) E2E has a negative case, (c) both scripts pass. Follows `P01-02b`.
- **CLI(s)**: `npm run test:unit`; `npm run test:e2e -- health`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/health/health.module.spec.ts`
  - **Modified**: `test/health.e2e-spec.ts`
  - **Deleted**: `None`
- **Branch**: `chore/test-vitest-setup` (shared)
- **Commit**: `test(health): add module compile and e2e negative smoke specs`
- **Testing**: `src/modules/health/health.module.spec.ts` asserts `module.get(HealthController)` is defined; `test/health.e2e-spec.ts` asserts `GET /does-not-exist` returns 404. Coverage from these specs feeds the gate in `P01-02d`.

### `P01-02d` — Enforce coverage thresholds and self-test the gate
- **Description**: Set global coverage thresholds in `vitest.config.ts` (statements/branches/functions/lines at the roadmap's enforced values, e.g. 80, with no bypass flag) and add `test/coverage.gate.spec.ts` asserting the configured numbers are present so a future edit cannot silently lower them. Mirror the same `test:cov` command into `.github/workflows/test.yml`. Then temporarily add an uncovered source file, confirm `npm run test:cov` fails, and remove it — the probe is never committed. Atomic checks: (a) thresholds configured, (b) negative probe fails the run, (c) final run passes at the committed thresholds. Follows `P01-02c` and completes `P01-02`.
- **CLI(s)**: `npm run test:cov`; `npm pkg set scripts.test:cov="vitest run --config vitest.unit.config.ts --coverage"` (if not already set in `P01-02b`).
- **Package(s)**: `None` — reuses `@vitest/coverage-v8` from `P01-02a`.
- **File(s)/Folder(s)**:
  - **Added**: `test/coverage.gate.spec.ts`
  - **Modified**: `vitest.config.ts`, `vitest.unit.config.ts`, `.github/workflows/test.yml`
  - **Deleted**: `None` (the temporary uncovered probe is removed before commit)
- **Branch**: `chore/test-vitest-setup` (shared)
- **Commit**: `chore(test): enforce coverage thresholds and self-test the gate`
- **Testing**: `test/coverage.gate.spec.ts` imports the Vitest config and asserts each threshold key exists with the expected numeric value; `npm run test:cov` passes on the committed tree; negative probe proves failure. No `vi.fn()` needed.

### `P01-03a` — Install faker and add the seeded random helper
- **Description**: Install `@faker-js/faker` as a devDependency and add `src/common/fixtures/seeded-faker.ts` exporting a single `createSeededFaker(seed: number)` helper that calls `faker.seed(seed)` before returning the faker instance. Add a spec calling the helper twice with the same seed and asserting deep-equal generated values, plus a different seed producing different values. Keep it under `src/common/fixtures/` so `P01-09a` can later promote faker to a dependency for Swagger examples. Atomic checks: (a) faker in `devDependencies`, (b) seeded helper exported, (c) determinism spec passes. This is the prerequisite for `P01-03b`/`P01-03c`.
- **CLI(s)**: `npm install -D @faker-js/faker`; `npm run test:unit`.
- **Package(s)**: installed as `devDependency`: `@faker-js/faker` (promoted to `dependencies` later by `P01-09a`).
- **File(s)/Folder(s)**:
  - **Added**: `src/common/fixtures/seeded-faker.ts`, `src/common/fixtures/seeded-faker.spec.ts`
  - **Modified**: `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `chore/test-faker-fixtures` (shared with `P01-03b`, `P01-03c`)
- **Commit**: `chore(test): add seeded faker helper for deterministic fixtures`
- **Testing**: `src/common/fixtures/seeded-faker.spec.ts` asserts two calls with seed `42` produce identical `faker.person.fullName()` / `faker.internet.email()` output and a different seed differs; no `vi.fn()` needed. Coverage thresholds pass.

### `P01-03b` — Add the example fixture factory used by later DTOs and OpenAPI
- **Description**: Add `src/common/fixtures/example.factory.ts` exporting `createExampleFixture(overrides: Partial<ExampleShape> = {})` built on `createSeededFaker()` from `P01-03a`, returning DTO-shaped data (`id` via `faker.string.uuid()`, `name`, `email` on a reserved `example.com` domain, `createdAt` ISO string). Add a spec asserting defaults are deterministic with a fixed seed and that overrides win. Do not copy literals by hand and do not include real emails, names or secrets. Atomic checks: (a) factory exported, (b) override behaviour covered, (c) no real-domain emails. Follows `P01-03a`; consumed by `P01-09a`/`P01-09b`.
- **CLI(s)**: `npm run test:unit`.
- **Package(s)**: `None` — reuses `@faker-js/faker` from `P01-03a`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/fixtures/example.factory.ts`, `src/common/fixtures/example.factory.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `chore/test-faker-fixtures` (shared)
- **Commit**: `chore(test): add seeded example fixture factory`
- **Testing**: `src/common/fixtures/example.factory.spec.ts` asserts deep equality for a fixed seed, that `overrides.name` is used verbatim, and that every generated `email` ends with `@example.com`; no `vi.fn()` needed.

### `P01-03c` — Add fixture barrel and cross-factory conformance checks
- **Description**: Add `src/common/fixtures/index.ts` re-exporting the seeded helper and the example factory as the single import surface for unit, E2E and later OpenAPI examples, and add `src/common/fixtures/fixtures.conformance.spec.ts` that iterates every exported factory twice with the same seed, asserting deep equality and scanning serialized output for obvious PII/secret patterns (real email domains, `password`, `token`, JWT-like strings). This is the conformance gate any future fixture factory must pass unchanged. Atomic checks: (a) barrel exists and is the only documented import path, (b) all factories covered by one spec, (c) PII/secret scan passes. Follows `P01-03b` and completes `P01-03`.
- **CLI(s)**: `npm run test:unit`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/fixtures/index.ts`, `src/common/fixtures/fixtures.conformance.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `chore/test-faker-fixtures` (shared)
- **Commit**: `test(fixtures): add fixture barrel and cross-factory conformance spec`
- **Testing**: `src/common/fixtures/fixtures.conformance.spec.ts` uses a table of `[name, factory]` entries with `vi.fn()` only if a future factory needs a mocked clock; today it asserts determinism and no-sensitive-value regexes for every entry. `npm run test:cov` keeps thresholds green.

## Phase Gate (end of step)

- [ ] Full unit tests + coverage thresholds pass (`test:unit`, `test:cov`) and E2E passes (`test:e2e`) including the health smoke path.
- [ ] Conformance specs pass for every adapter of any touched port — no ports are introduced in this step, so this is vacuously true; fixture conformance spec passes.
- [ ] `npm run typecheck`, `npm run lint`, `npm run format:check` clean; security audit & version sync run.
- [ ] No secrets or PII in fixtures (all emails use `@example.com`); faker is still a devDependency at this stage.
- [ ] Each atomic commit pushed on its shared branch; PRs merged into `dev` in this exact order:
  `P01-01a` → `P01-01b` → `P01-01c` → `P01-01d` → `P01-01e` → `P01-02a` → `P01-02b` → `P01-02c` → `P01-02d` → `P01-03a` → `P01-03b` → `P01-03c`.
- [ ] Status for umbrella IDs `P01-01`, `P01-02`, `P01-03` set to `✅ Done` in [`roadmap.md`](../../../roadmap.md) §4 (atomic IDs tracked here).
- [ ] Re-check the P01 exit criterion in [`roadmap.md`](../../../roadmap.md) §6.1 before starting Step 2.
