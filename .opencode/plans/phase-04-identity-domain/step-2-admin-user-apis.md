# P04 · Step 2 — Admin User APIs

**Project:** nestjs-ddd  |  **Phase:** P04 — Identity Domain  |  **Base branch:** `dev`  |  **Status:** ⬜ Planned

> Source of truth: [`roadmap.md`](../../../roadmap.md) §4. Umbrella IDs `P04-04`, `P04-05`, `P04-06` stay in the roadmap; this file lists the final atomic split (`P04-04a` … `P04-06c`).
> **Format**: `P<phase>-<umbrella><letter>` — one atomic task = one commit; sibling atomic tasks share one branch (branch per umbrella task). Every atomic task uses the 7-field format: `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing`.
> **Ordering notes**: (a) `P04-04a`/`P04-04b` define the request DTOs before `P04-05*` uses them, and `P04-04c` adds a deliberately thin RBAC guard placeholder that `P05-09c` replaces with the real declarative guard — the controller therefore keeps a single `@UseGuards()` insertion point. (b) `P04-05a` → `P04-05b` → `P04-05c` add one use case per operation before `P04-05d` wires the thin controller, so no business rule ever enters the controller. (c) All use cases depend only on `USER_REPOSITORY` (bound in `P04-03d`) and `PASSWORD_HASHER` (bound in `P04-02c`), both mocked with `vi.fn()` in unit specs; `P04-06*` runs the full E2E after the controller exists.

## DDD + SOLID lens for this step

- Bounded contexts own `domain/`, `application/`, `infrastructure/`, `interfaces/`; dependencies point inward.
- Domain/application depend only on port tokens; adapters are injected, never imported directly.
- Every port ships one conformance spec run against all adapters, including in-memory fallbacks.
- Business rules live in entities/value objects/use cases; controllers stay thin.
- Introduce a port only when a mechanism must be swappable or isolated for tests.
- Use cases live in `application/use-cases/` and are orchestration-only; one class per operation (SRP).
- The placeholder guard and the real `P05-08` guard share the same decorator surface, so authorization is swapped, not rewritten.

## Step Summary

Add validated admin request DTOs and a temporary RBAC guard placeholder, implement create/update/delete/list/get CRUD as single-purpose use cases behind a thin admin controller, and cover the whole surface with E2E happy- and negative-path suites that exercise the in-memory fallback path.

## Atomic Tasks

### `P04-04a` — Add admin create and update DTOs
- **Description**: Add `src/modules/user/interfaces/dto/create-user.dto.ts` and `update-user.dto.ts` with `class-validator` decorators for the admin surfaces: `email` (email format, normalised), `password` (min length, only on create/update), `sub` (optional, validated against the `P04-01a` shape) and `isActive`. Use `@ApiProperty({ example })` fed by the seeded `P01-09` faker factory — no hand-written sensitive literals. Add `@ApiTags('admin')` so `P01-08b`'s admin document filter picks these routes up. Depends on the `Sub`/`User` types from `P04-01a`/`P04-01b` only for validation shape; `P04-04b` adds list/query DTOs. Atomic checks: (a) malformed input rejected by validation, (b) examples come from the factory, (c) routes carry the `admin` tag.
- **CLI(s)**: `mkdir -p src/modules/user/interfaces/dto`; `npm run test:unit -- create-user.dto`; `npm run test:e2e -- validation`.
- **Package(s)**: `None` — reuses `class-validator`/`class-transformer` from `P01-03` and `@nestjs/swagger` from `P01-08a`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/user/interfaces/dto/create-user.dto.ts`, `src/modules/user/interfaces/dto/create-user.dto.spec.ts`, `src/modules/user/interfaces/dto/update-user.dto.ts`, `src/modules/user/interfaces/dto/update-user.dto.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/user-admin-dtos-guard` (shared with `P04-04b`, `P04-04c`)
- **Commit**: `feat(user): add admin create and update DTOs with validation`
- **Testing**: DTO specs use `validateSync()` on faker fixtures to assert invalid email/short password/malformed `sub` fail and valid ones pass; E2E `test/admin-validation.e2e-spec.ts` posts a payload with an unknown property and asserts the global `ValidationPipe` (`P01-05`) rejects it. Coverage thresholds pass.

### `P04-04b` — Add admin list-query and response DTOs
- **Description**: Add `src/modules/user/interfaces/dto/list-users.query.dto.ts` (page, limit, optional `email`/`isActive` filters with `@IsInt`, `@IsOptional`, `@Min/@Max`) and `user.response.dto.ts` (safe projection: `id`, `sub`, `email`, `isActive`, timestamps — never the password hash). Map aggregate → response in a single `src/modules/user/interfaces/mappers/user-response.mapper.ts` so no hash can leak through a controller. Add `@ApiTags('admin')` to keep the doc partition intact. Depends on `P04-04a` for the DTO folder and on `P04-01b` for the aggregate fields. Atomic checks: (a) query params validated, (b) response DTO has no password field, (c) mapper is the only aggregate→HTTP conversion.
- **CLI(s)**: `npm run test:unit -- list-users.query user-response.mapper`; `npm run typecheck`.
- **Package(s)**: `None` — reuses validation and Swagger packages already installed.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/user/interfaces/dto/list-users.query.dto.ts`, `src/modules/user/interfaces/dto/list-users.query.dto.spec.ts`, `src/modules/user/interfaces/dto/user.response.dto.ts`, `src/modules/user/interfaces/mappers/user-response.mapper.ts`, `src/modules/user/interfaces/mappers/user-response.mapper.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/user-admin-dtos-guard` (shared)
- **Commit**: `feat(user): add admin list query and safe response DTOs`
- **Testing**: Query DTO spec asserts out-of-range page/limit and malformed filters are rejected; mapper spec asserts the produced object contains no `passwordHash` key even when the source aggregate has one (`vi.fn()`-built aggregate fixture). Coverage thresholds pass.

### `P04-04c` — Add the RBAC guard placeholder
- **Description**: Create `src/modules/auth/interfaces/guards/roles.guard.ts` as a minimal, deliberately permissive placeholder implementing `CanActivate` plus a `@Roles(...roles)` decorator at `src/modules/auth/interfaces/decorators/roles.decorator.ts` that stores metadata under a single `ROLES_KEY`. The placeholder reads that metadata but always allows for now; it exists solely to fix the controller's `@UseGuards(RolesGuard)` insertion point that `P05-09c` will harden into the real declarative guard. Do not put any role policy in the controller. Depends on `P04-04a`/`P04-04b` only in that it shares the admin surface; `P05-08c` supplies the real logic. Atomic checks: (a) guard is thin and metadata-driven, (b) decorator sets one key, (c) no real authorization yet.
- **CLI(s)**: `mkdir -p src/modules/auth/interfaces/guards src/modules/auth/interfaces/decorators`; `npm run test:unit -- roles.guard`; `npm run typecheck`.
- **Package(s)**: `None` — uses `@nestjs/common` reflect/metadata primitives already present.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/interfaces/guards/roles.guard.ts`, `src/modules/auth/interfaces/guards/roles.guard.spec.ts`, `src/modules/auth/interfaces/decorators/roles.decorator.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/user-admin-dtos-guard` (shared)
- **Commit**: `feat(auth): add RBAC decorator and placeholder guard for admin APIs`
- **Testing**: `roles.guard.spec.ts` uses a `vi.fn()` `ExecutionContext` with `Reflect.getMetadata` to assert the guard reads `ROLES_KEY` and currently returns `true`; decorator spec asserts metadata is stored under exactly that key. E2E negative path (403) is deferred to `P05-09c` when the guard becomes real.

### `P04-05a` — Add the CreateUser use case
- **Description**: Add `src/modules/user/application/use-cases/create-user.use-case.ts` implementing a single `execute(dto: CreateUserDto)` operation: hash the password through `PASSWORD_HASHER`, build a `User` via the `P04-01b` factory, check uniqueness through the `P04-01c` domain service and persist through `USER_REPOSITORY` (`P04-03d`). Return the aggregate; never touch HTTP or the response mapper. Add a unit spec mocking both ports with `vi.fn()`. Depends on `P04-04a` (DTO) and all of step 1's ports; `P04-05d` calls this from the controller. Atomic checks: (a) one use case per operation, (b) both ports used via injected tokens, (c) no transport imports.
- **CLI(s)**: `mkdir -p src/modules/user/application/use-cases`; `npm run test:unit -- create-user.use-case`; `npm run typecheck`.
- **Package(s)**: `None` — orchestration only; ports from `P02-02`/`P04-03a`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/user/application/use-cases/create-user.use-case.ts`, `src/modules/user/application/use-cases/create-user.use-case.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/user-admin-crud` (shared with `P04-05b`, `P04-05c`, `P04-05d`)
- **Commit**: `feat(user): add CreateUser use case`
- **Testing**: `create-user.use-case.spec.ts` asserts `hash` is called once with the plain password, uniqueness is checked before `save`, and a duplicate-`Sub` error is propagated without calling `save` (mocks via `vi.fn()`). Coverage thresholds pass.

### `P04-05b` — Add the UpdateUser and DeleteUser use cases
- **Description**: Add `src/modules/user/application/use-cases/update-user.use-case.ts` and `delete-user.use-case.ts`. Update loads by id through `USER_REPOSITORY`, applies only the fields present in the `P04-04a` update DTO via the aggregate's own mutation methods (`P04-01b`), re-hashes a changed password through `PASSWORD_HASHER`, and saves. Delete issues a **soft** delete through the repository's `softDelete` method (`P04-03b`) and rejects deleting a missing user. Keep each class single-purpose with ports mocked by `vi.fn()`. Depends on `P04-05a` for the established pattern. Atomic checks: (a) two independent use cases, (b) mutations delegated to the entity, (c) delete is soft and 404s on missing id.
- **CLI(s)**: `npm run test:unit -- update-user.use-case delete-user.use-case`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/user/application/use-cases/update-user.use-case.ts`, `src/modules/user/application/use-cases/update-user.use-case.spec.ts`, `src/modules/user/application/use-cases/delete-user.use-case.ts`, `src/modules/user/application/use-cases/delete-user.use-case.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/user-admin-crud` (shared)
- **Commit**: `feat(user): add UpdateUser and soft-delete DeleteUser use cases`
- **Testing**: Both specs mock `USER_REPOSITORY` and `PASSWORD_HASHER` with `vi.fn()`; assert missing-id throws a not-found domain error, password re-hash only when supplied, and `softDelete` (never `delete`) is called. Coverage thresholds pass.

### `P04-05c` — Add the GetUser and ListUsers query use cases
- **Description**: Add `src/modules/user/application/use-cases/get-user.use-case.ts` and `list-users.use-case.ts` handling read operations. Get loads by id and throws a not-found domain error when absent; List applies the validated `P04-04b` page/limit/filters to `USER_REPOSITORY.findAll` and returns `{ items, total }` for paging metadata. Both are pure orchestration over the single repository port and depend on `P04-05a`'s pattern. Atomic checks: (a) not-found mapped to a domain error, (b) paging and filters forwarded to the port, (c) no response-DTO logic inside the use case.
- **CLI(s)**: `npm run test:unit -- get-user.use-case list-users.use-case`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/user/application/use-cases/get-user.use-case.ts`, `src/modules/user/application/use-cases/get-user.use-case.spec.ts`, `src/modules/user/application/use-cases/list-users.use-case.ts`, `src/modules/user/application/use-cases/list-users.use-case.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/user-admin-crud` (shared)
- **Commit**: `feat(user): add GetUser and ListUsers query use cases`
- **Testing**: Specs mock `USER_REPOSITORY` with `vi.fn()` and assert correct arguments for paging/filters, `{ items, total }` shape, and not-found propagation; coverage thresholds pass.

### `P04-05d` — Add the thin admin controller and wire the module
- **Description**: Add `src/modules/user/interfaces/admin-user.controller.ts` with `POST`, `GET /:id`, `GET`, `PATCH /:id` and `DELETE /:id` routes, each translating HTTP ↔ the `P04-05a`–`P04-05c` use cases and mapping through the `P04-04b` response mapper. Decorate the controller with `@ApiTags('admin')` and `@UseGuards(RolesGuard)` (`P04-04c`) and apply the `ValidationPipe`-driven DTOs from `P04-04a`/`P04-04b`; no business rules live here. Register the controller, all use cases and their port bindings in `src/modules/user/user.module.ts`. Depends on `P04-05a`–`P04-05c` and `P04-04c`. Atomic checks: (a) controller only delegates, (b) all five routes present, (c) module compiles with ports bound.
- **CLI(s)**: `npm run test:e2e -- admin-users`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `@nestjs/common` and existing Swagger/validation packages.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/user/interfaces/admin-user.controller.ts`, `src/modules/user/interfaces/admin-user.controller.spec.ts`
  - **Modified**: `src/modules/user/user.module.ts`, `src/app.module.ts` (import `UserModule` if not already mounted)
  - **Deleted**: `None`
- **Branch**: `feat/user-admin-crud` (shared)
- **Commit**: `feat(user): add thin admin user controller and wire use cases`
- **Testing**: Controller unit spec asserts each handler calls exactly one `vi.fn()` use case with the DTO and returns the mapper's output; E2E `test/admin-users.e2e-spec.ts` smoke-tests that all five routes resolve and that no `passwordHash` appears in any response body.

### `P04-06a` — Add admin CRUD E2E happy-path suite
- **Description**: Create `test/admin-users.e2e-spec.ts` covering the full happy path through a real Nest app on the in-memory fallback binding: create → get by id → list with paging → patch → soft delete → get returns 404. Use seeded faker factories (`P01-03`) for fixtures and assert the safe response DTO shape at every step. Depends on `P04-05d` (controller wired). Atomic checks: (a) all five operations chained, (b) in-memory path exercised, (c) no hash in responses.
- **CLI(s)**: `npm run test:e2e -- admin-users`; `npm run test:cov`.
- **Package(s)**: `None` — reuses Vitest + Supertest from `P01-02`.
- **File(s)/Folder(s)**:
  - **Added**: `test/admin-users.e2e-spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `chore/test-admin-e2e` (shared with `P04-06b`, `P04-06c`)
- **Commit**: `test(user): add admin CRUD happy-path E2E suite`
- **Testing**: Full chain asserts 201/200/204/404 status codes and response schema; fixtures from faker; coverage thresholds pass on the interfaces layer.

### `P04-06b` — Add admin API negative-path E2E suite
- **Description**: Add `test/admin-users-negative.e2e-spec.ts` covering: malformed DTO payloads rejected by the global `ValidationPipe` (`P01-05`) with 400, unknown properties rejected (whitelist), duplicate-`Sub` create returning a conflict mapped by the `P02-05` exception filter, get/patch/delete of a missing id returning 404, and the placeholder guard (`P04-04c`) still allowing access for now. Record the guard-403 case as a skipped test with a `P05-09c` TODO so the real RBAC suite can unskip it. Atomic checks: (a) 400/404/conflict paths covered, (b) whitelist verified, (c) RBAC 403 placeholder tracked.
- **CLI(s)**: `npm run test:e2e -- admin-users-negative`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `test/admin-users-negative.e2e-spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `chore/test-admin-e2e` (shared)
- **Commit**: `test(user): add admin API negative-path E2E coverage`
- **Testing**: Negative E2E asserts exact status codes and that domain errors are mapped to HTTP by `P02-05`; the `it.skip('403 for unprivileged', …)` case is explicitly annotated for `P05-09c`. Coverage thresholds pass.

### `P04-06c` — Consolidate admin E2E coverage and admin-doc assertions
- **Description**: Consolidate the admin E2E suites, add assertions that every admin route appears in the `admin/docs-json` document with the `admin` tag and never in the user document (`P01-08b`), and verify the in-memory fallback path is the one exercised in test env. Ensure no fixture contains real credentials or PII, and that the exception filter never leaks a password hash in an error body. Depends on `P04-06a` and `P04-06b`. Atomic checks: (a) admin/user doc partition verified, (b) memory fallback path confirmed, (c) no sensitive data in fixtures or errors.
- **CLI(s)**: `npm run test:e2e -- admin`; `npm run test:cov`; `npm run lint`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `None`
  - **Modified**: `test/admin-users.e2e-spec.ts`, `test/admin-users-negative.e2e-spec.ts`, `test/openapi.e2e-spec.ts` (add admin partition assertions)
  - **Deleted**: `None`
- **Branch**: `chore/test-admin-e2e` (shared)
- **Commit**: `test(user): consolidate admin E2E and openapi partition assertions`
- **Testing**: Merged E2E suite passes in test env; `docs-json` assertions confirm tag partitions; grep-style assertion that no response/error body contains a `password`/`hash` key. Coverage thresholds and lint pass.

## Phase Gate (end of step)

- [ ] Full unit tests + coverage thresholds pass; use case specs mock both ports with `vi.fn()`.
- [ ] E2E passes for admin CRUD happy paths, validation/whitelist/conflict/404 negative paths and the in-memory fallback binding.
- [ ] Admin routes present only in the admin OpenAPI document; no password hash in any response or error body.
- [ ] Lint / format / typecheck clean; security audit & version sync pass. Conformance specs from step 1 still pass unchanged.
- [ ] Each atomic commit pushed on its shared branch; PR merged into `dev` in this exact order:
  `P04-04a` → `P04-04b` → `P04-04c` → `P04-05a` → `P04-05b` → `P04-05c` → `P04-05d` → `P04-06a` → `P04-06b` → `P04-06c`.
- [ ] Status for umbrella IDs `P04-04`, `P04-05`, `P04-06` set to `✅ Done` in [`roadmap.md`](../../../roadmap.md) §4 (atomic IDs tracked here).
- [ ] Re-check the P04 exit criterion in [`roadmap.md`](../../../roadmap.md) §6.1 before starting the next step.
