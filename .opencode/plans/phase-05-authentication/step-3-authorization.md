# P05 · Step 3 — Authorization

**Project:** nestjs-ddd  |  **Phase:** P05 — Authentication  |  **Base branch:** `dev`  |  **Status:** ⬜ Planned

> Source of truth: [`roadmap.md`](../../../roadmap.md) §4. Umbrella IDs `P05-08`, `P05-09` stay in the roadmap; this file lists the final atomic split (`P05-08a` … `P05-09c`).
> **Format**: `P<phase>-<umbrella><letter>` — one atomic task = one commit; sibling atomic tasks share one branch (branch per umbrella task). Every atomic task uses the 7-field format: `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing`.
> **Ordering notes**: (a) `P05-08a` models `Role`/permissions as a domain value object, `P05-08b` adds the declarative `@Roles()` decorator, `P05-08c` replaces the permissive `P04-04c` placeholder guard with real metadata-driven logic, and `P05-08d` adds the unit guard spec + E2E role matrix. (b) `P05-09a` seeds roles idempotently; `P05-09b` attaches roles to the `User` aggregate (`P04-01b`) and includes them in token claims via `TOKEN_ISSUER` (`P05-04a`) and `JwtStrategy` (`P05-04d`); `P05-09c` decorates the admin controller (`P04-05d`) with `@Roles('admin')` and unskips the 403 test left by `P04-06b`. (c) The guard stays declarative — controllers state required roles via metadata; the guard reads that metadata plus JWT claims and never contains endpoint-specific rules.

## DDD + SOLID lens for this step

- Bounded contexts own `domain/`, `application/`, `infrastructure/`, `interfaces/`; dependencies point inward.
- Domain/application depend only on port tokens; adapters are injected, never imported directly.
- Every port ships one conformance spec run against all adapters, including in-memory fallbacks.
- Business rules live in entities/value objects/use cases; controllers stay thin.
- Introduce a port only when a mechanism must be swappable or isolated for tests.
- RBAC is declarative: roles are declared with a decorator and enforced by one guard reading claims + metadata.
- The `P04-04c` placeholder guard is swapped, not rewritten — its `@UseGuards(RolesGuard)` and `@Roles` surface is preserved.

## Step Summary

Add a domain role/permission model, a declarative `@Roles()` decorator and a real declarative `RolesGuard` that reads roles from JWT claims, then seed roles, carry them in token claims via the existing issuer/strategy, and protect the admin APIs with an E2E role matrix proving unprivileged access returns 403.

## Atomic Tasks

### `P05-08a` — Model the RBAC role and permission domain
- **Description**: Add `src/modules/auth/domain/value-objects/role.vo.ts` and `permission.vo.ts`. Define `Role` as a named value object (`admin`, `user`, etc.) holding a set of `Permission` values (e.g. `user:read`, `user:write`, `user:delete`), with `has(permission)` and `equals()` and constructor validation that rejects unknown/empty role names. Add `src/modules/auth/domain/services/role-permission.service.ts` as a pure service answering "does this role set satisfy the required roles/permissions?" so the decision rule is testable without Nest. Keep all of `domain/` framework-free. This is the prerequisite for `P05-08c`. Atomic checks: (a) role/permission are value objects, (b) decision service is pure, (c) unknown roles rejected.
- **CLI(s)**: `mkdir -p src/modules/auth/domain/services`; `npm run test:unit -- role.vo permission.vo role-permission.service`; `npm run typecheck`.
- **Package(s)**: `None` — pure domain types; no new dependency.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/domain/value-objects/role.vo.ts`, `src/modules/auth/domain/value-objects/role.vo.spec.ts`, `src/modules/auth/domain/value-objects/permission.vo.ts`, `src/modules/auth/domain/value-objects/permission.vo.spec.ts`, `src/modules/auth/domain/services/role-permission.service.ts`, `src/modules/auth/domain/services/role-permission.service.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/auth-rbac` (shared with `P05-08b`, `P05-08c`, `P05-08d`)
- **Commit**: `feat(auth): add RBAC role and permission domain model`
- **Testing**: VO specs assert unknown/empty roles throw and `has()`/`equals()` behave; `role-permission.service.spec.ts` table-tests role sets against required roles/permissions with faker fixtures and no mocks. Coverage thresholds pass.

### `P05-08b` — Add the declarative Roles decorator
- **Description**: Replace the placeholder decorator from `P04-04c` at `src/modules/auth/interfaces/decorators/roles.decorator.ts` with a real `ROLES_KEY` metadata setter accepting `...roles: Role[]` (or string literals validated against the `P05-08a` `Role` VO), and add a companion `RequirePermissions()` decorator setting a separate `PERMISSIONS_KEY`. Export both from a single `src/modules/auth/interfaces/decorators/index.ts` barrel so controllers import one path. The decorator stores only metadata — no logic. Depends on `P05-08a`. Atomic checks: (a) two metadata keys, (b) decorators are logic-free, (c) single import barrel.
- **CLI(s)**: `npm run test:unit -- roles.decorator`; `npm run typecheck`.
- **Package(s)**: `None` — uses `SetMetadata` from `@nestjs/common` already installed.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/interfaces/decorators/index.ts`, `src/modules/auth/interfaces/decorators/permissions.decorator.ts`, `src/modules/auth/interfaces/decorators/permissions.decorator.spec.ts`
  - **Modified**: `src/modules/auth/interfaces/decorators/roles.decorator.ts`, `src/modules/auth/interfaces/decorators/roles.decorator.spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-rbac` (shared)
- **Commit**: `feat(auth): add declarative Roles and RequirePermissions decorators`
- **Testing**: Decorator specs assert `Reflect.getMetadata(ROLES_KEY, …)` and `PERMISSIONS_KEY` return exactly the supplied values, and that invalid role literals are rejected. Coverage thresholds pass.

### `P05-08c` — Replace the placeholder guard with real declarative enforcement
- **Description**: Update `src/modules/auth/interfaces/guards/roles.guard.ts` from the permissive `P04-04c` stub into a real `CanActivate` guard that reads the required roles/permissions from the `P05-08b` metadata via `Reflector` and the user's roles from the validated request principal (populated by `JwtStrategy` in `P05-04d`), then delegates the allow/deny decision to the pure `P05-08a` role-permission service. Missing/empty required metadata means "no RBAC requirement" (allow), and an unauthenticated or insufficient principal throws `ForbiddenException` (403). Keep the guard declarative and generic — no endpoint names or business rules. Depends on `P05-08a`, `P05-08b` and `P05-04d`. Atomic checks: (a) metadata + claims drive the decision, (b) 403 on insufficient roles, (c) no endpoint-specific logic.
- **CLI(s)**: `npm run test:unit -- roles.guard`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `@nestjs/common` `Reflector` and existing domain service.
- **File(s)/Folder(s)**:
  - **Added**: `None`
  - **Modified**: `src/modules/auth/interfaces/guards/roles.guard.ts`, `src/modules/auth/interfaces/guards/roles.guard.spec.ts`, `src/modules/auth/auth.module.ts` (provide the guard)
  - **Deleted**: `None`
- **Branch**: `feat/auth-rbac` (shared)
- **Commit**: `feat(auth): implement declarative RBAC RolesGuard`
- **Testing**: `roles.guard.spec.ts` builds `ExecutionContext` and `Reflector` mocks with `vi.fn()` and asserts: matching role → `true`, missing role → `ForbiddenException`, no metadata → `true`, unauthenticated principal → 403. Coverage thresholds pass.

### `P05-08d` — Add guard unit coverage and the E2E role matrix
- **Description**: Consolidate `roles.guard.spec.ts` with edge cases (multiple required roles, permission-based requirements, expired-claim principal) and add `test/rbac-role-matrix.e2e-spec.ts` using a test controller with `@Roles('admin')` and `@Roles('user')` routes: an admin token reaches both, a user token reaches only the user route, and a token with no roles gets 403 on both. Assert the guard denies by default when required metadata is present but claims are missing. Depends on `P05-08c`. Atomic checks: (a) guard edge cases unit-tested, (b) E2E matrix covers admin/user/none, (c) default-deny enforced.
- **CLI(s)**: `npm run test:e2e -- rbac`; `npm run test:cov`.
- **Package(s)**: `None` — reuses Vitest/Supertest and the memory token issuer from `P05-04c`.
- **File(s)/Folder(s)**:
  - **Added**: `test/rbac-role-matrix.e2e-spec.ts`
  - **Modified**: `src/modules/auth/interfaces/guards/roles.guard.spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-rbac` (shared)
- **Commit**: `test(auth): add RBAC guard specs and role matrix E2E`
- **Testing**: E2E issues tokens via `TOKEN_ISSUER` with faker-built role claims and asserts 200/403 across the matrix; missing-claims principal gets 403. Coverage thresholds pass.

### `P05-09a` — Add an idempotent role seeder
- **Description**: Add `src/modules/auth/infrastructure/seed/role.seeder.ts` that creates the `admin` and `user` roles with their `P05-08a` permission sets on bootstrap, using an upsert keyed by role name so re-running is safe. Wire it through a `src/modules/auth/infrastructure/seed/role.seeder.module.ts` as a provider invoked on application start (or via an `npm run seed:roles` script for migrations), reading the seed data from a small typed config file — no credentials or secrets in the seed. Depends on `P05-08a` for the role definitions. Atomic checks: (a) idempotent upsert, (b) admin + user roles seeded, (c) no secrets in seed data.
- **CLI(s)**: `mkdir -p src/modules/auth/infrastructure/seed`; `npm pkg set scripts.seed:roles="ts-node src/modules/auth/infrastructure/seed/run-seed.ts"`; `npm run seed:roles`; `npm run typecheck`.
- **Package(s)**: `ts-node` installed as a devDependency with `npm install -D ts-node` if not already present by `P01-01`; otherwise `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/infrastructure/seed/role.seeder.ts`, `src/modules/auth/infrastructure/seed/role.seeder.spec.ts`, `src/modules/auth/infrastructure/seed/role.seeder.module.ts`, `src/modules/auth/infrastructure/seed/run-seed.ts`, `src/modules/auth/infrastructure/seed/seed-roles.config.ts`
  - **Modified**: `src/app.module.ts` (import seeder module), `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `feat/auth-seed-roles` (shared with `P05-09b`, `P05-09c`)
- **Commit**: `feat(auth): add idempotent role seeder for admin and user`
- **Testing**: `role.seeder.spec.ts` mocks the role store with `vi.fn()` and asserts running twice produces one `admin` and one `user` role (upsert, no duplicates) and that permissions match the `P05-08a` definitions. E2E smoke confirms roles exist after bootstrap. Coverage thresholds pass.

### `P05-09b` — Attach roles to users and include them in token claims
- **Description**: Extend the `User` aggregate from `P04-01b` with a role collection (via a domain method `assignRoles()` that only accepts valid `P05-08a` roles) and map it through `src/modules/user/interfaces/mappers/user-response.mapper.ts` where needed. Extend `TokenPayload` (`P05-04a`) with a `roles: string[]` claim so `TOKEN_ISSUER` (`P05-04b`/`P05-04c`) stamps roles into issued tokens, and update `JwtStrategy` (`P05-04d`) to expose those claims on the `AuthenticatedPrincipal` used by the `P05-08c` guard. Keep this a data-plumbing change — no new authorization rules. Depends on `P05-09a` (roles exist) and `P05-08a` (role type). Atomic checks: (a) roles on the aggregate, (b) roles in token claims, (c) guard reads them from the principal.
- **CLI(s)**: `npm run test:unit -- user.entity jwt-token-issuer jwt.strategy`; `npm run test:e2e -- auth-login`; `npm run typecheck`.
- **Package(s)**: `None` — extends existing types/adapters only.
- **File(s)/Folder(s)**:
  - **Added**: `None`
  - **Modified**: `src/modules/user/domain/entities/user.entity.ts`, `src/modules/user/domain/entities/user.entity.spec.ts`, `src/modules/auth/domain/types/token.types.ts`, `src/modules/auth/adapters/jwt-token-issuer.adapter.ts`, `src/modules/auth/adapters/memory-token-issuer.adapter.ts`, `src/modules/auth/strategies/jwt.strategy.ts`, `src/modules/auth/strategies/jwt.strategy.spec.ts`, `src/modules/shared/ports/conformance/token-issuer.conformance-spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-seed-roles` (shared)
- **Commit**: `feat(auth): carry user roles in token claims for the RBAC guard`
- **Testing**: Add a `roles` assertion to the `TOKEN_ISSUER` conformance spec so both JWT and memory adapters include the claim; `jwt.strategy.spec.ts` asserts roles are placed on the principal via `vi.fn()`; login E2E decodes a token and confirms `roles` present. All port conformance specs stay green.

### `P05-09c` — Protect admin APIs and unskip the 403 E2E
- **Description**: Apply `@Roles('admin')` from `P05-08b` (via the `P05-08c` guard already registered on the controller) to `src/modules/user/interfaces/admin-user.controller.ts` from `P04-05d`, replacing the placeholder behaviour. Unskip the `it.skip('403 for unprivileged')` case from `P04-06b` and extend `test/admin-users-negative.e2e-spec.ts` with: a `user`-role token gets 403 on all admin CRUD routes, an `admin`-role token succeeds, and a token with no roles gets 403. Verify the admin OpenAPI document (`P01-08b`) shows the bearer + roles requirement. Depends on `P05-09b` (claims populated). Atomic checks: (a) admin routes require admin role, (b) 403 for user/no-role tokens, (c) 200 for admin token.
- **CLI(s)**: `npm run test:e2e -- admin auth-revocation rbac`; `npm run test:cov`; `npm run lint`.
- **Package(s)**: `None` — reuses the `RolesGuard` and role claims already wired.
- **File(s)/Folder(s)**:
  - **Added**: `test/admin-protection.e2e-spec.ts`
  - **Modified**: `src/modules/user/interfaces/admin-user.controller.ts`, `test/admin-users-negative.e2e-spec.ts`, `test/openapi.e2e-spec.ts` (admin auth requirements)
  - **Deleted**: `None`
- **Branch**: `feat/auth-seed-roles` (shared)
- **Commit**: `feat(auth): protect admin APIs with admin role and 403 E2E coverage`
- **Testing**: `admin-protection.e2e-spec.ts` issues admin/user/no-role tokens through `TOKEN_ISSUER` (memory fallback in test) and asserts 200 for admin, 403 for the other two on every CRUD route; previously skipped case now passes; coverage thresholds and all conformance specs green.

## Phase Gate (end of step)

- [ ] Full unit tests + coverage thresholds pass; the `RolesGuard` spec uses `vi.fn()` mocks for `Reflector`/`ExecutionContext`.
- [ ] E2E passes for the RBAC role matrix and admin API protection: admin 200, user/no-role 403, default-deny on missing claims.
- [ ] `TOKEN_ISSUER` conformance spec (both JWT + memory adapters) still passes with the new `roles` claim; role seeder is idempotent.
- [ ] RBAC is declarative — required roles live in decorators and the guard reads metadata + claims, with no endpoint-specific rules.
- [ ] Lint / format / typecheck clean; security audit & version sync pass.
- [ ] Each atomic commit pushed on its shared branch; PR merged into `dev` in this exact order:
  `P05-08a` → `P05-08b` → `P05-08c` → `P05-08d` → `P05-09a` → `P05-09b` → `P05-09c`.
- [ ] Status for umbrella IDs `P05-08`, `P05-09` set to `✅ Done` in [`roadmap.md`](../../../roadmap.md) §4 (atomic IDs tracked here).
- [ ] Re-check the P05 exit criterion in [`roadmap.md`](../../../roadmap.md) §6.1 before starting the next step — Phase P05 is now complete (login → tokens → refresh → logout → revocation works, RBAC protects admin APIs).
