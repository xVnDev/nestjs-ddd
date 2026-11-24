# P03 · Step 1 — Persistence

**Project:** nestjs-ddd  |  **Phase:** P03 — Data & Infrastructure  |  **Base branch:** `dev`  |  **Status:** ⬜ Planned

> Source of truth: [`roadmap.md`](../../../roadmap.md) §4. Umbrella IDs `P03-01`, `P03-02`, `P03-03` stay in the roadmap; this file lists the final atomic split (`P03-01a` … `P03-03d`).
> **Format**: `P<phase>-<umbrella><letter>` — one atomic task = one commit; sibling atomic tasks share one branch (branch per umbrella). Every atomic task uses the 7-field format: `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing`.
> **Ordering notes**: (a) `P03-01a` defines the small typed database config provider that `P03-01b` feeds into `TypeOrmModule.forRootAsync()`; `P03-01c` then proves the app boots and drops the connection cleanly. (b) `P03-02a` (port) → `P03-02b` (soft-delete base) → `P03-02c` (TypeORM adapter) → `P03-02d` (shared conformance spec) → `P03-02e` (memory fallback runs that same spec unchanged). (c) `P03-03a` builds the CLI data source from the *same* config object as `P03-01b`, so `P03-03b` can generate a migration that `P03-03c` applies/reverts and `P03-03d` enforces in CI.

## DDD + SOLID lens for this step

- Bounded contexts own `domain/`, `application/`, `infrastructure/`, `interfaces/`; dependencies point inward.
- Domain/application depend only on port tokens; adapters are injected, never imported directly.
- Every port ships one conformance spec run against all adapters, including in-memory fallbacks.
- Business rules live in entities/value objects/use cases; controllers stay thin.
- Introduce a port only when a mechanism must be swappable or isolated for tests.

## Step Summary

Register TypeORM PostgreSQL through a small typed `as Provider()` config slice, add a framework-free soft-delete contract plus a repository port with TypeORM and in-memory adapters proven by one shared conformance spec, then generate an initial migration and enforce apply/revert in CI.

## Atomic Tasks

### `P03-01a` — Add the typed, validated database config slice
- **Description**: Create `src/common/config/database.config.ts` using `registerAs('database', ...)` for `url`, `ssl`, `poolSize`, `logging` and `synchronize: false`, exported as a typed value consumable via `as Provider()` by `TypeOrmModule.forRootAsync()`. Extend the Joi env schema from `P01-04` with the required `DATABASE_URL` and optional `DATABASE_SSL`/`DATABASE_POOL_SIZE` variables so a missing URL fails fast at bootstrap. Config holds data only — no entity mapping, soft-delete rule or repository logic — which is deferred to `P03-01b`/`P03-02*`; this atomic must land first. Atomic checks: (a) `registerAs('database')` namespace with typed fields, (b) Joi rejects a missing/invalid `DATABASE_URL`, (c) the exported value is injectable as a provider and `synchronize` is hard-`false`.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`; negative smoke `DATABASE_URL= npm run start` (must fail fast).
- **Package(s)**: `None` — reuses `@nestjs/config` and `joi` installed by `P01-04`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/config/database.config.ts`, `src/common/config/database.config.spec.ts`
  - **Modified**: `src/common/config/env.validation.ts` (from `P01-04`), `src/common/config/config.module.ts` (`load` array)
  - **Deleted**: `None`
- **Branch**: `feat/db-typeorm-postgres` (shared with `P03-01b`, `P03-01c`)
- **Commit**: `feat(db): add typed database config slice with joi validation`
- **Testing**: `src/common/config/database.config.spec.ts` asserts the returned object shape/types, `synchronize === false`, and that it can be injected through `as Provider()` in a `Test.createTestingModule()`; add a `vi.fn()` spy on `process.env` access to prove no raw env reads outside config; coverage thresholds unchanged.

### `P03-01b` — Register TypeORM PostgreSQL async config
- **Description**: Install `@nestjs/typeorm`, `typeorm`, `pg` and its types, then add `src/modules/shared/infrastructure/persistence/persistence.module.ts` calling `TypeOrmModule.forRootAsync({ useFactory: (cfg) => ({ type: 'postgres', ...cfg }), inject: [DATABASE_CONFIG] })` with the provider from `P03-01a`. Import the module into `src/app.module.ts` and keep `autoLoadEntities: true` so later context entities are discovered without editing bootstrap. No repository or soft-delete behaviour lives here — that is `P03-02*` — and this atomic depends on `P03-01a`. Atomic checks: (a) `forRootAsync` consumes the typed config token, (b) app compiles with a valid `DATABASE_URL`, (c) no secrets are logged or hard-coded.
- **CLI(s)**: `npm install @nestjs/typeorm typeorm pg`; `npm install -D @types/pg`; `npm run typecheck`; `npm run test:unit`.
- **Package(s)**: installed with `npm install @nestjs/typeorm typeorm pg` (first-party Nest TypeORM module + PostgreSQL driver) and `npm install -D @types/pg` (driver types).
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/infrastructure/persistence/persistence.module.ts`, `src/modules/shared/infrastructure/persistence/persistence.module.spec.ts`
  - **Modified**: `src/app.module.ts`, `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `feat/db-typeorm-postgres` (shared)
- **Commit**: `feat(db): register typeorm postgresql async config`
- **Testing**: `persistence.module.spec.ts` compiles a Nest testing module with `vi.fn()` on the config factory and asserts `forRootAsync` receives `type: 'postgres'` plus the injected values; a negative spec asserts bootstrap fails when the config token is absent; coverage thresholds pass.

### `P03-01c` — Prove boot, connection and graceful close
- **Description**: Add a Postgres-backed E2E smoke test that boots the real Nest app, asserts `getRepository` can run `SELECT 1`, then sends `SIGTERM`/calls `app.close()` and asserts the pool is drained without open-handle leaks. Use Testcontainers Postgres in CI and a local `docker-compose` database for developers; no SaaS dependency is introduced. This atomic depends on `P03-01b` and gates `P03-03c`, which reuses the same container fixture for migration up/down. Atomic checks: (a) query succeeds against a clean database, (b) shutdown logs no leak and the process exits 0, (c) test fixture is deterministic via seeded faker values from `P01-03`.
- **CLI(s)**: `npm install -D testcontainers`; `npm run test:e2e -- persistence`; `npm run typecheck`.
- **Package(s)**: `testcontainers` installed as a devDependency for the CI Postgres fixture; reuses `typeorm`/`pg` from `P03-01b`.
- **File(s)/Folder(s)**:
  - **Added**: `test/persistence.e2e-spec.ts`, `test/support/postgres-container.ts`
  - **Modified**: `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `feat/db-typeorm-postgres` (shared)
- **Commit**: `test(db): cover postgres boot, query and graceful shutdown`
- **Testing**: `test/persistence.e2e-spec.ts` asserts the `SELECT 1` result, the absence of open handles after `app.close()`, and that no credential/PII appears in logs; a `vi.fn()` spy on the data source `destroy()` confirms it was called; coverage thresholds enforced.

### `P03-02a` — Define the repository port and DI token
- **Description**: Add `src/modules/shared/ports/repository.port.ts` with a narrow generic `RepositoryPort<T>` (`findById`, `findAll`, `save`, `softDelete`, `restore`, `count`) and a single `REPOSITORY_PORT` token, matching the port rules established in `P02-02`. The interface imports only framework-free types; no TypeORM symbol crosses the seam. Add a type-level spec and keep this atomic ahead of every adapter and conformance work in `P03-02b`…`P03-02e`. Atomic checks: (a) one token, one narrow interface, (b) zero infrastructure imports, (c) all six methods are present and typed.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/ports/repository.port.ts`, `src/modules/shared/ports/repository.port.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/db-soft-delete-port` (shared with `P03-02b` … `P03-02e`)
- **Commit**: `feat(db): add repository port and di token`
- **Testing**: `repository.port.spec.ts` is a compile-time/type test asserting the token is a single symbol and that a dummy class implementing `RepositoryPort<T>` type-checks; a static-import guard with `vi.fn()`-backed file scan asserts no `typeorm` import; coverage thresholds unchanged.

### `P03-02b` — Add the soft-delete base contract and its TypeORM mapping
- **Description**: Add a framework-free `SoftDeletable` abstract base under `src/modules/shared/domain/` carrying `id`, `createdAt`, `updatedAt` and `deletedAt`, so domain code never imports TypeORM. Add the TypeORM-decorated persistence base at `src/modules/shared/infrastructure/persistence/soft-delete.entity.ts` using `@PrimaryGeneratedColumn('uuid')`, `@CreateDateColumn`, `@UpdateDateColumn` and `@DeleteDateColumn` mapped from that contract. This atomic depends on `P03-02a` and supplies the column that the `softDelete`/`restore` adapter methods in `P03-02c` rely on. Atomic checks: (a) domain base has no decorators, (b) `deletedAt` maps to `@DeleteDateColumn`, (c) UUID primary key generated.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `typeorm` from `P03-01b`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/domain/soft-deletable.ts`, `src/modules/shared/domain/soft-deletable.spec.ts`, `src/modules/shared/infrastructure/persistence/soft-delete.entity.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/db-soft-delete-port` (shared)
- **Commit**: `feat(db): add soft-delete base entity and typeorm mapping`
- **Testing**: `soft-deletable.spec.ts` asserts default `deletedAt` is `null` and timestamps are assigned by the clock port from `P02-02` via `vi.fn()`; a metadata unit spec asserts the TypeORM base declares a delete-date column and a UUID primary column; coverage thresholds pass.

### `P03-02c` — Implement the TypeORM repository adapter
- **Description**: Implement `TypeOrmRepositoryAdapter<T>` in `src/modules/shared/infrastructure/persistence/` satisfying `RepositoryPort<T>` from `P03-02a`, mapping `softDelete()` to TypeORM `softDelete`/`softRemove` and `restore()` to `restore()`, with `findAll`/`findById` excluding deleted rows and `withDeleted()` only for explicit admin reads. Register it against `REPOSITORY_PORT` in `persistence.module.ts` from `P03-01b`; no business rule decides *when* to delete — that stays in future use cases. This atomic is the first adapter the conformance spec in `P03-02d` will run against. Atomic checks: (a) adapter injected by token, (b) deleted rows hidden by default, (c) `restore()` makes the row visible again.
- **CLI(s)**: `npm run test:unit`; `npm run test:e2e -- repository`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `typeorm`/`@nestjs/typeorm` from `P03-01b`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/infrastructure/persistence/typeorm-repository.adapter.ts`, `src/modules/shared/infrastructure/persistence/typeorm-repository.adapter.spec.ts`
  - **Modified**: `src/modules/shared/infrastructure/persistence/persistence.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/db-soft-delete-port` (shared)
- **Commit**: `feat(db): add typeorm repository adapter with soft delete`
- **Testing**: `typeorm-repository.adapter.spec.ts` uses a Testcontainers database (fixture from `P03-01c`) and `vi.fn()` on the TypeORM manager to assert `softDelete`, `restore` and `withDeleted` calls; verify a soft-deleted row is absent from `findById`/`findAll` and present after `restore`; coverage thresholds unchanged.

### `P03-02d` — Add the shared repository port conformance spec
- **Description**: Create `src/modules/shared/infrastructure/persistence/repository.conformance.spec.ts` using the harness from `P02-03`, parameterised over a `RepositoryPort<T>` adapter factory, covering CRUD, soft-delete visibility, restore, count and delete-date timestamp behaviour in one unchanged suite. Wire it to the TypeORM adapter from `P03-02c` and commit the suite as the canonical contract that `P03-02e` must pass without edits. No adapter-specific setup leaks into the spec — factories supply fixtures via seeded faker factories from `P01-03`. Atomic checks: (a) one shared spec file, (b) TypeORM adapter passes it unchanged, (c) spec is exported for reuse by the memory adapter.
- **CLI(s)**: `npm run test:unit -- repository`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/infrastructure/persistence/repository.conformance.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/db-soft-delete-port` (shared)
- **Commit**: `test(db): add shared repository port conformance spec`
- **Testing**: The conformance spec asserts identical observable behaviour for all six port methods, uses `vi.fn()` to instrument the adapter factory, and enforces the adapter coverage threshold (≥90% lines/branches on adapter code); it must be imported, not copied, by `P03-02e`.

### `P03-02e` — Add the in-memory repository fallback and run the same conformance spec
- **Description**: Add `InMemoryRepositoryAdapter<T>` under `src/modules/shared/infrastructure/persistence/`, a production-shaped fallback (Map-backed, deep-copied values, generated UUIDs and clock timestamps) registered as the default when no `DATABASE_URL` is configured, so local development and tests need no external service. Import the `P03-02d` conformance spec unchanged and parameterise it with this adapter's factory; never fork the suite to accommodate fallback quirks. This atomic depends on `P03-02d` and completes the port's adapter coverage. Atomic checks: (a) fallback injectable via the same token, (b) same spec passes with zero edits, (c) no data leaks between tests/factories.
- **CLI(s)**: `npm run test:unit -- repository`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/infrastructure/persistence/in-memory-repository.adapter.ts`, `src/modules/shared/infrastructure/persistence/in-memory-repository.adapter.spec.ts`
  - **Modified**: `src/modules/shared/infrastructure/persistence/persistence.module.ts`, `src/modules/shared/infrastructure/persistence/repository.conformance.spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/db-soft-delete-port` (shared)
- **Commit**: `feat(db): add in-memory repository fallback and conform it`
- **Testing**: `in-memory-repository.adapter.spec.ts` imports the shared conformance spec verbatim; a `vi.fn()` clock proves timestamps come from the `CLOCK` port; deep-copy assertions prove callers cannot mutate stored rows; coverage thresholds met for both adapters.

### `P03-03a` — Add the CLI data source and migration scripts
- **Description**: Create `src/common/config/data-source.ts` that reuses the exact typed config object from `P03-01a` to build a standalone TypeORM `DataSource` for the CLI, so runtime and migrations cannot drift. Add npm scripts `typeorm`, `migration:generate`, `migration:run` and `migration:revert` via `npm pkg set`, using `typeorm-ts-node-commonjs -d src/common/config/data-source.ts`. This atomic gates `P03-03b`/`P03-03c` and keeps `synchronize: false` by construction. Atomic checks: (a) CLI data source imports the shared config provider, (b) four scripts exist and resolve, (c) no duplicate connection options.
- **CLI(s)**: `npm install -D ts-node`; `npm pkg set scripts.typeorm="typeorm-ts-node-commonjs -d src/common/config/data-source.ts"`; `npm pkg set scripts.migration:generate="npm run typeorm -- migration:generate"`; `npm pkg set scripts.migration:run="npm run typeorm -- migration:run"`; `npm pkg set scripts.migration:revert="npm run typeorm -- migration:revert"`; `npm run typecheck`.
- **Package(s)**: `ts-node` installed as a devDependency for the TypeORM CLI; reuses `typeorm`/`pg` from `P03-01b`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/config/data-source.ts`, `src/common/config/data-source.spec.ts`
  - **Modified**: `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `feat/db-initial-migration` (shared with `P03-03b` … `P03-03d`)
- **Commit**: `feat(db): add cli data source and migration scripts`
- **Testing**: `data-source.spec.ts` asserts the CLI data source options deep-equal the injected config from `P03-01a` using a `vi.fn()` config spy; a script-existence spec reads `package.json` and asserts all four commands are defined; coverage thresholds unchanged.

### `P03-03b` — Generate and review the initial migration
- **Description**: Run `npm run migration:generate -- -n Init` against a clean Postgres from the `P03-01c` fixture so TypeORM captures the soft-delete base and any context entities registered so far. Review the generated file by hand: it must create the `deleted_at` column with an index, use UUID primary keys and contain no data-seeding or business logic; `synchronize` stays off. This atomic depends on `P03-03a` and produces the artifact that `P03-03c` applies. Atomic checks: (a) one checked-in migration file, (b) `deleted_at` column + index present, (c) no hand-written business rules or secrets.
- **CLI(s)**: `npm run migration:generate -- -n Init`; `npm run migration:run`; `npm run typecheck`.
- **Package(s)**: `None` — reuses the CLI scripts from `P03-03a`.
- **File(s)/Folder(s)**:
  - **Added**: `src/migrations/<timestamp>-Init.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/db-initial-migration` (shared)
- **Commit**: `feat(db): generate initial schema migration`
- **Testing**: A migration-content spec asserts the generated `up()` contains a `deleted_at TIMESTAMP` column and an index and that `down()` drops the created tables; `npm run migration:run` succeeds on the clean container from `P03-01c`; coverage thresholds pass.

### `P03-03c` — Verify apply and revert on a clean database
- **Description**: Add a migration E2E spec that starts the `P03-01c` Postgres container, runs `migration:run`, inspects `information_schema` to confirm the expected tables/columns exist, then runs `migration:revert` and confirms they are gone — proving reversibility rather than just success. Reuse the same container fixture so no second infrastructure path is introduced. This atomic depends on `P03-03b` and is the local equivalent of the CI job in `P03-03d`. Atomic checks: (a) up creates tables, (b) down removes them, (c) repeated run is idempotent/no-op for already-applied migrations.
- **CLI(s)**: `npm run test:e2e -- migration`; `npm run migration:run`; `npm run migration:revert`.
- **Package(s)**: `None` — reuses `testcontainers` from `P03-01c` and scripts from `P03-03a`.
- **File(s)/Folder(s)**:
  - **Added**: `test/migration.e2e-spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/db-initial-migration` (shared)
- **Commit**: `test(db): verify migration apply and revert on clean postgres`
- **Testing**: `test/migration.e2e-spec.ts` queries `information_schema.columns` before/after each direction, uses a `vi.fn()` spy on the CLI runner to count executed migrations, asserts zero pending migrations after `run`, and enforces coverage thresholds.

### `P03-03d` — Add the CI migration check
- **Description**: Extend the `ubuntu-latest` CI workflow (checkout `actions/checkout@v6`, setup-node `actions/setup-node@v7` with `node-version: 'lts/*'`) with a job that boots a Postgres service, runs `npm run migration:run`, executes `npm run typeorm -- migration:show` and fails if any pending migration is reported, then runs the revert spec from `P03-03c`. Add a static assertion that `synchronize` is never enabled outside tests. This atomic depends on `P03-03c` and completes the P03 persistence gate. Atomic checks: (a) CI fails on a pending migration, (b) revert job runs on the same runner, (c) `synchronize: false` enforced in code review/check.
- **CLI(s)**: `npm run migration:run`; `npm run typeorm -- migration:show`; `npm run lint`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `.github/workflows/migration-check.yml` (or a new job in the existing CI workflow)
  - **Modified**: `.github/workflows/ci.yml` (job ordering/needs), `package.json` (optional `migration:check` script)
  - **Deleted**: `None`
- **Branch**: `feat/db-initial-migration` (shared)
- **Commit**: `ci(db): enforce migration apply, revert and pending check`
- **Testing**: The CI job itself is the test: a deliberately added pending migration must make `migration:show` fail (self-test), the `P03-03c` revert spec must pass in CI, and a config spec with `vi.fn()` asserts `synchronize` resolves to `false` in every non-test environment; coverage thresholds unchanged.

## Phase Gate (end of step)

- [ ] Full unit tests + coverage thresholds pass.
- [ ] Boot E2E passes against Postgres and the connection is destroyed cleanly on shutdown.
- [ ] Repository port conformance spec passes unchanged for the TypeORM adapter **and** the in-memory fallback.
- [ ] Initial migration applies and reverts on a clean Postgres; CI pending-migration check passes; `synchronize` stays `false`.
- [ ] Typed config validated; no secrets or PII committed; lint/format/typecheck clean.
- [ ] Security audit & version sync pass.
- [ ] Each atomic commit pushed on its shared branch; PR merged into `dev` in this exact order:
  `P03-01a` → `P03-01b` → `P03-01c` → `P03-02a` → `P03-02b` → `P03-02c` → `P03-02d` → `P03-02e` → `P03-03a` → `P03-03b` → `P03-03c` → `P03-03d`.
- [ ] Status for umbrella IDs `P03-01`, `P03-02`, `P03-03` set to `✅ Done` in [`roadmap.md`](../../../roadmap.md) §4 (atomic IDs tracked here).
- [ ] Re-check the P03 exit criterion in [`roadmap.md`](../../../roadmap.md) §6.1 before starting the next step.
