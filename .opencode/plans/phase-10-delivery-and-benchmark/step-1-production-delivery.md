# P10 · Step 1 — Production Delivery & Benchmark

**Project:** nestjs-ddd  |  **Phase:** P10 — Delivery & Benchmark  |  **Base branch:** `dev`  |  **Status:** ⬜ Planned

> Source of truth: [`roadmap.md`](../../../roadmap.md) §4. Umbrella IDs `P10-01`, `P10-02`, `P10-03` stay in the roadmap; this file lists the final atomic split (`P10-01a` … `P10-03d`).
> **Format**: `P<phase>-<umbrella><letter>` — one atomic task = one commit; sibling atomic tasks share one branch (branch per umbrella task). Every atomic task uses the 7-field format: `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing`.
> **Ordering notes**: (a) `P10-01a` writes the multi-stage Dockerfile first; `P10-01b` adds `.dockerignore`/healthcheck, `P10-01c` adds the compose file, `P10-01d` proves the image builds and starts. (b) `P10-02` depends on the image from `P10-01`; its workflow consumes secrets only at deploy time — never at image build time. (c) `P10-03` runs against the built image from `P10-01` and is strictly last. (d) P10 is the final phase; the `v1.0.0` tag was already created in `P09-10d` and must not be recreated here.
> **Correctness invariant**: the production image and deploy configuration **must not bake secrets into the image** — no `COPY .env`, no `ENV` with credentials, all secrets injected at runtime from CI secrets/env files, and asserted by a `docker history`/smoke check in `P10-01d`/`P10-02d`.

## DDD + SOLID lens for this step

- Use NestJS 12 first-party APIs over hand-rolled infrastructure.
- Config is small, typed and exported as `as Provider()` for async module options.
- No business rules in config, CI or docs; no secrets or PII committed.
- Tests use Vitest with `vi.fn()` mocks and faker fixtures.

## Step Summary

Produce a reproducible, secret-free production delivery path: a hardened multi-stage Docker image, a runtime compose/deploy configuration, a CI/CD deploy workflow with a runbook, and a repeatable performance benchmark with a recorded baseline — split into small individually committable atomics.

## Atomic Tasks

### `P10-01a` — Add a multi-stage production Dockerfile without baked secrets
- **Description**: Create a multi-stage `Dockerfile` with `deps`, `build` and `runtime` stages on a Node LTS Alpine base, installing only production dependencies in the runtime image, copying compiled `dist/`, running as a non-root user, and using `node dist/main.js` as the entrypoint. Do **not** `COPY .env`, do not set any credential via `ENV`, and do not embed build args containing secrets (use build args only for non-sensitive metadata like version). Atomic checks: (a) three stages present, (b) runtime runs as non-root, (c) no `ENV`/`COPY` line contains a secret or `.env`.
- **CLI(s)**: `docker build --target runtime -t nestjs-ddd:local .`; `docker build --check .` (BuildKit check when available); `npm run lint`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `Dockerfile`, `test/dockerfile.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/infra-production-docker` (shared with `P10-01b`, `P10-01c`, `P10-01d`)
- **Commit**: `feat(infra): add multi-stage production dockerfile without baked secrets`
- **Testing**: `dockerfile.spec.ts` parses the Dockerfile and asserts stage names, `USER` non-root, and absence of `.env`/secret `ENV`/`COPY` patterns; smoke build in `P10-01d`; coverage thresholds pass.

### `P10-01b` — Add .dockerignore and a runtime healthcheck
- **Description**: Add a `.dockerignore` excluding `.env*`, `.git/`, `node_modules/`, `test/`, coverage output and `.opencode/` so the build context never carries secrets or local artifacts. Add a healthcheck script/endpoint check that the image can use via `HEALTHCHECK` (hitting the app's existing health route), and expose the non-root runtime user configuration consistently with `P10-01a`. Atomic checks: (a) `.env*` and `node_modules` ignored, (b) healthcheck references a real route, (c) no secret slips into the context.
- **CLI(s)**: `docker build -t nestjs-ddd:local .`; `npm run test:unit -- docker-config`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `.dockerignore`, `scripts/docker-healthcheck.mjs`, `scripts/docker-healthcheck.spec.ts`
  - **Modified**: `Dockerfile`, `test/dockerfile.spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/infra-production-docker` (shared)
- **Commit**: `feat(infra): add dockerignore and runtime healthcheck`
- **Testing**: `.dockerignore` spec asserts sensitive patterns via `vi.fn()`-mocked `fs` reads; healthcheck spec asserts the script targets the health route and exits non-zero on failure; coverage thresholds pass.

### `P10-01c` — Add production compose configuration with runtime secrets
- **Description**: Create `docker-compose.prod.yml` defining the app plus Postgres and Redis using the adapters from `P03-01`/`P03-04`, with all credentials supplied via `env_file`/environment variables resolved at container start — never embedded in the image or committed `.env`. Wire the healthcheck from `P10-01b` and ensure the app waits for dependencies. Atomic checks: (a) no hard-coded passwords in the file, (b) `env_file` used for secrets, (c) healthcheck and dependency ordering present.
- **CLI(s)**: `docker compose -f docker-compose.prod.yml config --quiet` (with placeholder env values); `npm run test:unit -- compose-config`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `docker-compose.prod.yml`, `test/compose-config.spec.ts`, `.env.production.example` (placeholders only, no real values)
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/infra-production-docker` (shared)
- **Commit**: `feat(infra): add production compose with runtime-only secrets`
- **Testing**: Compose spec parses the YAML and asserts no literal secret values, `env_file` usage and healthcheck/depends-on keys; example env contains only faker-style placeholders; coverage thresholds pass.

### `P10-01d` — Add a container smoke test and secret-leak assertion
- **Description**: Add a smoke script that builds the runtime image, starts it with placeholder env, waits for the healthcheck, curls a known route, then inspects `docker history`/`docker inspect` to assert no `ENV` layer or file contains a secret marker. Verify the image starts and serves with production env values supplied at runtime. Atomic checks: (a) image builds and becomes healthy, (b) route responds, (c) secret-marker scan over image layers finds nothing.
- **CLI(s)**: `npm run test:container`; `docker history --no-trunc nestjs-ddd:local | grep -i '<secret-marker>'` (expect no matches).
- **Package(s)**: `None` — uses Docker CLI and Node built-ins only.
- **File(s)/Folder(s)**:
  - **Added**: `scripts/container-smoke.mjs`, `scripts/container-smoke.spec.ts`, `test/container-smoke.e2e-spec.ts`
  - **Modified**: `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `feat/infra-production-docker` (shared)
- **Commit**: `test(infra): smoke-test production image and assert no baked secrets`
- **Testing**: Smoke spec uses `vi.fn()` on `child_process.execFile` to assert build/run/health/inspect calls and that a deliberately injected secret marker is detected (negative self-test); E2E asserts health route 200; coverage thresholds pass.

### `P10-02a` — Add the production CI/CD deploy workflow
- **Description**: Add a GitHub Actions workflow (runner `ubuntu-latest`: checkout `actions/checkout@v6`, setup-node `actions/setup-node@v7` with `node-version: 'lts/*'`) triggered on `v*` tags/`workflow_dispatch` that runs install → lint → unit/E2E → coverage → security scans → Docker build → push to registry → deploy. Reference all credentials via `${{ secrets.* }}` and environment variables — never literal values in the YAML. Atomic checks: (a) correct runner, (b) full gate sequence present, (c) no literal secret values.
- **CLI(s)**: `npm run lint`; `actionlint .github/workflows/deploy.yml` (or the repo's workflow linter); `npm run test:unit -- deploy-workflow`.
- **Package(s)**: `None` — uses existing npm scripts and GitHub Actions.
- **File(s)/Folder(s)**:
  - **Added**: `.github/workflows/deploy.yml`, `test/deploy-workflow.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/infra-deploy-workflow` (shared with `P10-02b`, `P10-02c`, `P10-02d`)
- **Commit**: `ci(infra): add production deploy workflow with full gate sequence`
- **Testing**: Workflow spec parses the YAML and asserts runner, job order, `${{ secrets.* }}` usage and absence of literal credentials; `vi.fn()` for any YAML-loader mock; coverage thresholds pass.

### `P10-02b` — Harden deploy credentials with least privilege
- **Description**: Configure a protected `production` GitHub environment with required reviewers, restrict the workflow to the `v1.0.0+` tag pattern, and use OIDC short-lived credentials for the registry/cloud deploy instead of long-lived keys where supported. Ensure secrets are injected only at the deploy step and never passed as Docker build args, keeping them out of image layers. Atomic checks: (a) environment protection declared, (b) OIDC permission block present, (c) no build-arg secrets.
- **CLI(s)**: `actionlint .github/workflows/deploy.yml`; `npm run test:unit -- deploy-workflow`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `None`
  - **Modified**: `.github/workflows/deploy.yml`, `test/deploy-workflow.spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/infra-deploy-workflow` (shared)
- **Commit**: `ci(infra): harden deploy workflow with oidc and protected environment`
- **Testing**: Spec asserts environment name, `permissions`/OIDC block, tag filter, and that no `build-args` line references a secret; coverage thresholds pass.

### `P10-02c` — Write the production deploy and rollback runbook
- **Description**: Add `docs/runbooks/production-deploy.md` covering prerequisites, how to trigger a deploy, the exact gate sequence, health verification, how to read metrics/alerts from `P09`, a step-by-step rollback to the previous image/tag, and a backup/restore + DR section (database dump/restore commands and verification). Include a secret-handling note stating secrets live only in CI secrets/runtime env, never in the image or repo. Atomic checks: (a) deploy, rollback and backup/restore sections present, (b) verification references metrics/health, (c) secret note present.
- **CLI(s)**: `npm run docs:check`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `docs/runbooks/production-deploy.md`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/infra-deploy-workflow` (shared)
- **Commit**: `docs(infra): add production deploy and rollback runbook`
- **Testing**: Doc link check passes; manual review that every command in the runbook exists in `package.json` or the workflow; coverage thresholds unchanged.

### `P10-02d` — Validate the workflow with lint and a dry run
- **Description**: Run the workflow linter and a dry-run validation (e.g. `act -n` or the repo's equivalent) with placeholder secrets to confirm job syntax and ordering, fix any findings, and assert once more that no secret value would be baked into the image during the simulated build. Atomic checks: (a) linter clean, (b) dry run parses all jobs, (c) no image-layer secret exposure in the simulated run.
- **CLI(s)**: `actionlint .github/workflows/deploy.yml`; `act -n -s GITHUB_TOKEN=placeholder` (if available); `npm run test:unit -- deploy-workflow`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `None`
  - **Modified**: `.github/workflows/deploy.yml`, `test/deploy-workflow.spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/infra-deploy-workflow` (shared)
- **Commit**: `test(infra): lint and dry-run the production deploy workflow`
- **Testing**: Spec re-asserts no literal secrets and correct job graph using `vi.fn()` mocks; linter/dry-run output captured in CI; coverage thresholds pass.

### `P10-03a` — Add the benchmark tool and repeatable scenario script
- **Description**: Add a benchmark tool (e.g. `autocannon` as a devDependency) and a scenario script that drives representative endpoints (health, login, a read query) against a running app with configurable connection count and duration, using seeded faker fixtures for payloads. No real credentials or PII in scenarios. Atomic checks: (a) tool installed as devDependency, (b) scenario script deterministic via seed, (c) no real secrets in fixtures.
- **CLI(s)**: `npm install --save-dev autocannon`; `npm pkg set scripts.benchmark="node scripts/benchmark.mjs"`; `npm run benchmark -- --duration 5`.
- **Package(s)**: `autocannon` installed with `npm install --save-dev autocannon`.
- **File(s)/Folder(s)**:
  - **Added**: `scripts/benchmark.mjs`, `scripts/benchmark.spec.ts`, `scripts/benchmark-scenarios.ts`
  - **Modified**: `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `chore/perf-benchmark-baseline` (shared with `P10-03b`, `P10-03c`, `P10-03d`)
- **Commit**: `chore(perf): add repeatable benchmark tool and scenario script`
- **Testing**: `benchmark.spec.ts` asserts scenario configuration is seeded and fixtures contain no PII using `vi.fn()` on the runner; a 5-second smoke run completes; coverage thresholds pass.

### `P10-03b` — Define benchmark metrics and a non-blocking CI job
- **Description**: Define the recorded metrics (requests/sec, p50/p95/p99 latency, error rate) and add a CI job that runs a short benchmark on `ubuntu-latest` (checkout `actions/checkout@v6`, setup-node `actions/setup-node@v7` with `node-version: 'lts/*'`) in **non-blocking** mode (informational, never fails the build on threshold breaches at this stage). Keep thresholds in a typed config file so they can be tightened later. Atomic checks: (a) all four metrics captured, (b) CI job is informational/non-blocking, (c) thresholds in typed config.
- **CLI(s)**: `npm run benchmark -- --duration 10 --json > benchmark-results.json`; `npm run test:unit -- benchmark-config`.
- **Package(s)**: `None` — reuses `autocannon` from `P10-03a`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/config/benchmark.config.ts`, `src/common/config/benchmark.config.spec.ts`, `.github/workflows/benchmark.yml`
  - **Modified**: `scripts/benchmark.mjs`
  - **Deleted**: `None`
- **Branch**: `chore/perf-benchmark-baseline` (shared)
- **Commit**: `ci(perf): add non-blocking benchmark metrics job`
- **Testing**: Config spec validates metric fields/thresholds with Joi; workflow spec asserts `continue-on-error`/informational mode via `vi.fn()`-backed YAML parsing; coverage thresholds pass.

### `P10-03c` — Record the baseline results with reproduction steps
- **Description**: Run the benchmark against the built production image and record the results in `docs/perf/baseline.md` with environment details (Node version, runner, connection count, duration), the four metrics and exact commands to reproduce. State clearly that these are baseline values, not enforced SLOs. Atomic checks: (a) baseline doc present with all four metrics, (b) reproduction commands match scripts, (c) no real credentials/PII in results.
- **CLI(s)**: `npm run benchmark -- --duration 30 --json`; `npm run docs:check`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `docs/perf/baseline.md`, `docs/perf/baseline.spec.ts`, `benchmark-results.json`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `chore/perf-benchmark-baseline` (shared)
- **Commit**: `docs(perf): record benchmark baseline and reproduction steps`
- **Testing**: `baseline.spec.ts` asserts all four metric fields are populated numeric values and reproduction commands reference existing npm scripts; doc link check passes; coverage thresholds pass.

### `P10-03d` — Add a benchmark smoke test and baseline verification
- **Description**: Add a final verification spec that a short benchmark run completes successfully against a fresh app, produces a result file parseable by the baseline doc checker, and that recorded baseline values are present and finite. Confirm the whole delivery chain (image → deploy config → benchmark) is documented and green. Atomic checks: (a) short run succeeds, (b) result file matches schema, (c) baseline values finite and documented.
- **CLI(s)**: `npm run benchmark -- --duration 5 --json`; `npm run test:unit -- benchmark`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `test/benchmark-smoke.e2e-spec.ts`
  - **Modified**: `scripts/benchmark.spec.ts`, `docs/perf/baseline.spec.ts`
  - **Deleted**: `None`
- **Branch**: `chore/perf-benchmark-baseline` (shared)
- **Commit**: `test(perf): verify benchmark smoke run and baseline schema`
- **Testing**: Smoke E2E asserts the run exits 0 and emits JSON with finite numeric metrics (mocked runner via `vi.fn()` for unit assertions); baseline checker asserts schema conformance; coverage thresholds pass.

## Phase Gate (end of step)

- [ ] Full unit tests + coverage thresholds pass; lint/format/typecheck clean.
- [ ] Container smoke test builds/starts the image and asserts **no secrets baked into image layers**; compose config uses runtime env only.
- [ ] Deploy workflow lints and dry-runs clean with OIDC/protected environment and no literal credentials; runbook documents deploy + rollback.
- [ ] Benchmark runs repeatably and the baseline is recorded with reproduction steps.
- [ ] Typed config validated; no secrets or PII committed; security audit & version sync pass; the `v1.0.0` tag from `P09-10d` is unchanged and not recreated.
- [ ] Each atomic commit pushed on its shared branch; PRs merged into `dev` in this exact order:
  `P10-01a` → `P10-01b` → `P10-01c` → `P10-01d` → `P10-02a` → `P10-02b` → `P10-02c` → `P10-02d` → `P10-03a` → `P10-03b` → `P10-03c` → `P10-03d`.
- [ ] Status for umbrella IDs `P10-01`, `P10-02`, `P10-03` set to `✅ Done` in [`roadmap.md`](../../../roadmap.md) §4 (atomic IDs tracked here).
- [ ] Re-check the P10 exit criterion in [`roadmap.md`](../../../roadmap.md) §6.1 — reproducible production deploy documented and benchmark baseline recorded — before closing the roadmap.
