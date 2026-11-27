# P03 · Step 2 — Cache & Queue with Fallbacks

**Project:** nestjs-ddd  |  **Phase:** P03 — Data & Infrastructure  |  **Base branch:** `dev`  |  **Status:** ✅ Done

> Source of truth: [`roadmap.md`](../../../roadmap.md) §4. Umbrella IDs `P03-04`, `P03-05`, `P03-06` stay in the roadmap; this file lists the final atomic split (`P03-04a` … `P03-06f`).
> **Format**: `P<phase>-<umbrella><letter>` — one atomic task = one commit; sibling atomic tasks share one branch (branch per umbrella). Every atomic task uses the 7-field format: `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing`.
> **Ordering notes**: (a) `P03-04a` (typed config) → `P03-04b` (CACHE port/token) → `P03-04c` (Keyv Redis adapter) → `P03-04d` (shared conformance spec against Redis). (b) `P03-05a` adds the in-memory fallback only after the spec exists; `P03-05b` runs that *same* spec unchanged and proves a zero-service boot. (c) `P03-06a`…`P03-06c` mirror the cache order for QUEUE, then `P03-06d` fixes the conformance contract before `P03-06e`/`P03-06f` add and conform the memory fallback; mail in Step 3 depends on the QUEUE port produced here.

## DDD + SOLID lens for this step

- Bounded contexts own `domain/`, `application/`, `infrastructure/`, `interfaces/`; dependencies point inward.
- Domain/application depend only on port tokens; adapters are injected, never imported directly.
- Every port ships one conformance spec run against all adapters, including in-memory fallbacks.
- Business rules live in entities/value objects/use cases; controllers stay thin.
- Introduce a port only when a mechanism must be swappable or isolated for tests.

## Step Summary

Add a Keyv Redis cache adapter behind a narrow CACHE port with a `nestjs-ddd` namespace and honoured TTL, add a first-class in-memory fallback that passes the identical conformance spec, then do the same for a BullMQ queue with a producer/worker split and an in-memory fallback — so the whole stack boots with zero external services.

## Atomic Tasks

### `P03-04a` — Add the typed, validated cache config slice
- **Description**: Create `src/common/config/cache.config.ts` using `registerAs('cache', ...)` with `namespace: 'nestjs-ddd'`, `defaultTtlSeconds`, `redisUrl` (optional) and `adapter: 'redis' | 'memory'`, exported as a typed value usable via `as Provider()` by async module options. Extend the Joi env schema from `P01-04` with `CACHE_REDIS_URL` and `CACHE_TTL_SECONDS` so an invalid URL or TTL fails fast. Config is data only: no eviction policy, key-formatting rule or fallback selection logic — those are adapter concerns in `P03-04c`/`P03-05a`; this atomic must land first. Atomic checks: (a) `registerAs('cache')` typed namespace, (b) Joi rejects a bad `CACHE_TTL_SECONDS`, (c) default namespace is exactly `nestjs-ddd`.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `@nestjs/config` and `joi` from `P01-04`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/config/cache.config.ts`, `src/common/config/cache.config.spec.ts`
  - **Modified**: `src/common/config/env.validation.ts`, `src/common/config/config.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/cache-keyv-redis` (shared with `P03-04b` … `P03-04d`)
- **Commit**: `feat(cache): add typed cache config slice with joi validation`
- **Testing**: `src/common/config/cache.config.spec.ts` asserts the typed object, the literal `nestjs-ddd` namespace and the TTL default, and injects it via `as Provider()` in a `Test.createTestingModule()`; a `vi.fn()` env spy proves no raw `process.env` reads; coverage thresholds unchanged.

### `P03-04b` — Define the CACHE port and DI token
- **Description**: Add `src/modules/shared/ports/cache.port.ts` with a narrow `CachePort` (`get<T>(key)`, `set(key, value, ttlSeconds?)`, `delete(key)`, `has(key)`) and the single `CACHE_PORT` token already reserved in `P02-02`. The port is generic over serialisable values and imports no Keyv, Redis or Nest type, so consumer use cases can be tested with `vi.fn()` mocks. This atomic gates `P03-04c` and must precede the conformance suite in `P03-04d`. Atomic checks: (a) one token, four narrow methods, (b) zero infrastructure imports, (c) TTL is an optional per-call argument, not global state.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/ports/cache.port.spec.ts`
  - **Modified**: `None`, `src/modules/shared/ports/cache.port.ts`
  - **Deleted**: `None`
- **Branch**: `feat/cache-keyv-redis` (shared)
- **Commit**: `feat(cache): add cache port and di token in shared kernel`
- **Testing**: `cache.port.spec.ts` type-checks a dummy implementation and asserts the token is unique; a static scan with `vi.fn()` on the file reader asserts no `keyv`/`ioredis` import; coverage thresholds pass.

### `P03-04c` — Implement the Keyv Redis cache adapter with namespace
- **Description**: Add `src/modules/shared/infrastructure/cache/keyv-redis-cache.adapter.ts` implementing `CachePort` via Keyv with the `@keyv/redis` store, prefixing every key with `nestjs-ddd:` from `P03-04a` and honouring per-call TTL with the config default as fallback. Register it in `src/modules/shared/infrastructure/cache/cache.module.ts` against `CACHE_PORT` using the typed config provider; adapters are injected by token, never imported by consumers. This atomic depends on `P03-04b` and is the first adapter the spec in `P03-04d` will exercise. Atomic checks: (a) namespace prefix on every key, (b) TTL passed to Keyv `set`, (c) adapter bound only via `CACHE_PORT`.
- **CLI(s)**: `npm install keyv @keyv/redis ioredis`; `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: installed with `npm install keyv @keyv/redis ioredis` (Keyv abstraction, Redis store and connection client); no hand-rolled cache module since the CACHE port is the seam.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/infrastructure/cache/keyv-redis-cache.adapter.ts`, `src/modules/shared/infrastructure/cache/keyv-redis-cache.adapter.spec.ts`, `src/modules/shared/infrastructure/cache/cache.module.ts`
  - **Modified**: `src/app.module.ts`, `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `feat/cache-keyv-redis` (shared)
- **Commit**: `feat(cache): add keyv redis adapter with boilerplate namespace`
- **Testing**: `keyv-redis-cache.adapter.spec.ts` mocks the Keyv instance with `vi.fn()` and asserts `set(key, value, ttl)` receives a `nestjs-ddd:`-prefixed key and the configured TTL; a second spec uses a real Redis test container to prove TTL expiry; coverage thresholds unchanged.

### `P03-04d` — Add the shared CACHE port conformance spec
- **Description**: Create `src/modules/shared/infrastructure/cache/cache.conformance.spec.ts` with the harness from `P02-03`, parameterised over a `CachePort` adapter factory, covering set/get round-trip, namespace isolation, TTL expiry, missing-key behaviour, overwrite and delete in one unchanged suite. Run it against the Redis adapter from `P03-04c` and export it for `P03-05b`; no adapter-specific setup belongs in the spec — fixtures come from seeded faker factories in `P01-03`. This atomic fixes the contract before any fallback exists. Atomic checks: (a) single shared suite, (b) Redis adapter passes it unchanged, (c) TTL cases use a controllable clock/mocked timer, never `sleep()`.
- **CLI(s)**: `npm run test:unit -- cache`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/infrastructure/cache/cache.conformance.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/cache-keyv-redis` (shared)
- **Commit**: `test(cache): add shared cache port conformance spec`
- **Testing**: The conformance spec asserts identical results for all four methods, uses `vi.fn()` fake timers for TTL assertions, and enforces the adapter coverage threshold (≥90% lines/branches); it must be imported verbatim by `P03-05b`.

### `P03-05a` — Add the in-memory cache fallback adapter
- **Description**: Add `src/modules/shared/infrastructure/cache/in-memory-cache.adapter.ts` implementing `CachePort` with a Map plus expiry timestamps, a deep-copy boundary on get/set and the same `nestjs-ddd:` namespace rule as `P03-04c`; it is a first-class production-shaped adapter, not a test stub. Wire it in `cache.module.ts` as the default when `adapter: 'memory'` (no Redis URL), satisfying the zero-external-services goal. This atomic depends on `P03-04d` because the spec is the contract it must meet; `P03-05b` then runs that spec. Atomic checks: (a) same port and namespace, (b) TTL enforced without Redis, (c) no mutation leak between callers.
- **CLI(s)**: `npm run test:unit -- cache`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/infrastructure/cache/in-memory-cache.adapter.ts`, `src/modules/shared/infrastructure/cache/in-memory-cache.adapter.spec.ts`
  - **Modified**: `src/modules/shared/infrastructure/cache/cache.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/cache-memory-fallback` (shared with `P03-05b`)
- **Commit**: `feat(cache): add in-memory cache fallback adapter`
- **Testing**: `in-memory-cache.adapter.spec.ts` uses `vi.fn()` fake timers to assert expiry, a `vi.fn()` clock from `P02-02` for deterministic timestamps, and deep-copy assertions that stored values cannot be mutated by callers; coverage thresholds unchanged.

### `P03-05b` — Conform the memory adapter and prove a zero-service boot
- **Description**: Import the `P03-04d` conformance suite unchanged and parameterise it with the in-memory adapter factory; additionally add an equivalence spec that runs a small identical script against both adapters and compares observable results. Add an E2E boot with `adapter: 'memory'` asserting the app starts and serves a cache round-trip without Redis running. This atomic depends on `P03-05a` and closes the CACHE port's adapter coverage. Atomic checks: (a) same spec file, zero edits, (b) both adapters green, (c) boot succeeds with Redis stopped.
- **CLI(s)**: `npm run test:unit -- cache`; `npm run test:e2e -- cache-memory`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `test/cache-memory.e2e-spec.ts`, `src/modules/shared/infrastructure/cache/cache-equivalence.spec.ts`
  - **Modified**: `src/modules/shared/infrastructure/cache/cache.conformance.spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/cache-memory-fallback` (shared)
- **Commit**: `test(cache): conform memory adapter and cover zero-service boot`
- **Testing**: The shared conformance spec runs against both factories; `cache-equivalence.spec.ts` uses `vi.fn()` spies on each adapter's `set/get` to compare call sequences; E2E asserts a cached value survives two requests with no Redis process; coverage thresholds met for both adapters.

### `P03-06a` — Add the typed, validated queue config slice
- **Description**: Create `src/common/config/queue.config.ts` using `registerAs('queue', ...)` with `redisUrl` (optional), `prefix: 'nestjs-ddd'`, `defaultJobOptions` (`attempts`, exponential `backoff`) and `adapter: 'bullmq' | 'memory'`, exported as a typed `as Provider()` value. Extend Joi env validation with `QUEUE_REDIS_URL`, `QUEUE_PREFIX` and `QUEUE_DEFAULT_ATTEMPTS`, failing fast on invalid values. Config stores data only — retry policy enforcement and worker logic live in the adapter at `P03-06c`; this atomic gates `P03-06b`…`P03-06f`. Atomic checks: (a) typed `registerAs('queue')` namespace, (b) Joi rejects bad attempt counts, (c) default prefix is `nestjs-ddd`.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `@nestjs/config` and `joi` from `P01-04`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/config/queue.config.ts`, `src/common/config/queue.config.spec.ts`
  - **Modified**: `src/common/config/env.validation.ts`, `src/common/config/config.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/queue-bullmq-fallback` (shared with `P03-06b` … `P03-06f`)
- **Commit**: `feat(queue): add typed queue config slice with joi validation`
- **Testing**: `queue.config.spec.ts` asserts the typed object, the `nestjs-ddd` prefix and default job options, and injection via `as Provider()`; a `vi.fn()` env spy proves validated reads only; coverage thresholds unchanged.

### `P03-06b` — Define the QUEUE port and DI token
- **Description**: Add `src/modules/shared/ports/queue.port.ts` with a narrow `QueuePort` covering the producer/worker split: `enqueue(name, payload, options?)`, `registerWorker(name, handler)` and `close()`, plus the single `QUEUE_PORT` token from `P02-02`. Keep the interface free of BullMQ types so producers and workers can be unit-tested with `vi.fn()` handlers and swapped without editing callers. This atomic gates `P03-06c` and must precede the conformance suite in `P03-06d`. Atomic checks: (a) one token, three narrow methods, (b) zero BullMQ/ioredis imports, (c) named queues are first-class via the `name` argument.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/ports/queue.port.spec.ts`
  - **Modified**: `None`, `src/modules/shared/ports/queue.port.ts`
  - **Deleted**: `None`
- **Branch**: `feat/queue-bullmq-fallback` (shared)
- **Commit**: `feat(queue): add queue port and di token in shared kernel`
- **Testing**: `queue.port.spec.ts` type-checks a dummy producer/worker implementation, asserts the token is unique, and uses a `vi.fn()` static-import scan to prove no infrastructure dependency; coverage thresholds pass.

### `P03-06c` — Implement the BullMQ adapter with producer and worker
- **Description**: Add `src/modules/shared/infrastructure/queue/bullmq-queue.adapter.ts` implementing `QueuePort` with named BullMQ queues, the `nestjs-ddd` prefix from `P03-06a`, default attempts/backoff applied to enqueued jobs, and a `close()` that drains producers and workers gracefully during shutdown. Register it in `src/modules/shared/infrastructure/queue/queue.module.ts` against `QUEUE_PORT` using the typed config provider. This atomic depends on `P03-06b` and is the first adapter the conformance spec in `P03-06d` exercises; mail's producer/worker in Step 3 will consume this port. Atomic checks: (a) named queues created with the prefix, (b) attempts/backoff set on jobs, (c) `close()` awaits worker shutdown.
- **CLI(s)**: `npm install bullmq ioredis`; `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: installed with `npm install bullmq ioredis` (BullMQ and its Redis client); reuses `ioredis` from `P03-04c`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/infrastructure/queue/bullmq-queue.adapter.ts`, `src/modules/shared/infrastructure/queue/bullmq-queue.adapter.spec.ts`, `src/modules/shared/infrastructure/queue/queue.module.ts`
  - **Modified**: `src/app.module.ts`, `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `feat/queue-bullmq-fallback` (shared)
- **Commit**: `feat(queue): add bullmq adapter with named queues and worker`
- **Testing**: `bullmq-queue.adapter.spec.ts` mocks BullMQ `Queue`/`Worker` constructors with `vi.fn()` and asserts job options, prefix and registration on `registerWorker`; a container-backed spec proves enqueue → handler called → job completed; graceful-close spec asserts no open handles; coverage thresholds unchanged.

### `P03-06d` — Add the shared QUEUE port conformance spec
- **Description**: Create `src/modules/shared/infrastructure/queue/queue.conformance.spec.ts` with the harness from `P02-03`, parameterised over a `QueuePort` adapter factory, covering enqueue→process→complete, named-queue isolation, handler failure/retry, payload round-trip and `close()` in one unchanged suite. Run it against the BullMQ adapter from `P03-06c` and export it for the memory adapter in `P03-06f`. Fixtures use seeded faker factories from `P01-03` and all timing uses fake timers/`vi.fn()` callbacks. Atomic checks: (a) one shared suite, (b) BullMQ adapter passes unchanged, (c) spec is reusable by another factory with no edits.
- **CLI(s)**: `npm run test:unit -- queue`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/infrastructure/queue/queue.conformance.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/queue-bullmq-fallback` (shared)
- **Commit**: `test(queue): add shared queue port conformance spec`
- **Testing**: The conformance spec asserts identical observable results for all three methods, uses `vi.fn()` worker handlers and fake timers for retry/backoff, and enforces the adapter coverage threshold (≥90% lines/branches); `P03-06f` must import it verbatim.

### `P03-06e` — Add the in-memory queue fallback adapter
- **Description**: Add `src/modules/shared/infrastructure/queue/in-memory-queue.adapter.ts` implementing `QueuePort` with an async in-process job loop, named-queue maps, retry/backoff driven by the injected `CLOCK` port from `P02-02`, and a `close()` that drains pending jobs. Wire it as the default in `queue.module.ts` when `adapter: 'memory'`, so mail and all other producers work with zero external services. This atomic depends on `P03-06d` (the contract) and is followed by `P03-06f` running that contract. Atomic checks: (a) same port and named-queue semantics, (b) retry/backoff honoured without Redis, (c) no thrown-away test stub — it is a first-class adapter.
- **CLI(s)**: `npm run test:unit -- queue`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/infrastructure/queue/in-memory-queue.adapter.ts`, `src/modules/shared/infrastructure/queue/in-memory-queue.adapter.spec.ts`
  - **Modified**: `src/modules/shared/infrastructure/queue/queue.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/queue-bullmq-fallback` (shared)
- **Commit**: `feat(queue): add in-memory queue fallback adapter`
- **Testing**: `in-memory-queue.adapter.spec.ts` uses `vi.fn()` handlers and `vi.fn()` fake timers/clock to assert retry counts and backoff; asserts `close()` waits for in-flight jobs; coverage thresholds unchanged.

### `P03-06f` — Conform the memory queue adapter and E2E the producer/worker path
- **Description**: Import the `P03-06d` conformance suite unchanged with the in-memory factory and add an E2E that boots the app with `adapter: 'memory'`, enqueues a named job, and asserts the registered worker receives the seeded faker payload exactly once with no Redis process. Add an equivalence assertion that both queue adapters satisfy the identical contract. This atomic depends on `P03-06e` and completes the QUEUE port's adapter coverage before Step 3 builds mail on it. Atomic checks: (a) same spec file, zero edits, (b) both adapters green, (c) E2E works with Redis stopped.
- **CLI(s)**: `npm run test:unit -- queue`; `npm run test:e2e -- queue-memory`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `test/queue-memory.e2e-spec.ts`
  - **Modified**: `src/modules/shared/infrastructure/queue/queue.conformance.spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/queue-bullmq-fallback` (shared)
- **Commit**: `test(queue): conform memory adapter and cover producer-worker path`
- **Testing**: Shared conformance spec passes for BullMQ and memory factories; `test/queue-memory.e2e-spec.ts` uses a `vi.fn()` worker handler to assert one delivery and correct payload; coverage thresholds met for both adapters.

## Phase Gate (end of step)

- [x] Full unit tests + coverage thresholds pass.
- [x] CACHE port conformance spec passes unchanged for the Keyv Redis adapter **and** the in-memory fallback.
- [x] QUEUE port conformance spec passes unchanged for the BullMQ adapter **and** the in-memory fallback.
- [x] E2E proves both memory-fallback boots work with zero external services; namespace `nestjs-ddd` and TTL/job options verified.
- [x] Typed config validated; no secrets or PII committed; lint/format/typecheck clean.
- [x] Security audit & version sync pass.
- [x] Each atomic commit pushed on its shared branch; PR merged into `dev` in this exact order:
  `P03-04a` → `P03-04b` → `P03-04c` → `P03-04d` → `P03-05a` → `P03-05b` → `P03-06a` → `P03-06b` → `P03-06c` → `P03-06d` → `P03-06e` → `P03-06f`.
- [x] Status for umbrella IDs `P03-04`, `P03-05`, `P03-06` set to `✅ Done` in [`roadmap.md`](../../../roadmap.md) §4 (atomic IDs tracked here).
- [x] Re-check the P03 exit criterion in [`roadmap.md`](../../../roadmap.md) §6.1 before starting the next step.
