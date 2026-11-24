# P0 · Step 1 — Repository & Planning System

**Project:** nestjs-ddd  |  **Phase:** P0 — Governance & Planning  |  **Base branch:** `dev`  |  **Status:** ✅ Done

> Source of truth: [`roadmap.md`](../../../roadmap.md) §4. Umbrella IDs `P0-01`, `P0-02` stay in the roadmap; this file lists the final atomic split (`P0-01a` … `P0-02f`).
> **Format**: `P<phase>-<umbrella><letter>` — one atomic task = one commit; sibling atomic tasks share one branch (branch per umbrella task). Every atomic task uses the 7-field format: `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing`.
> **Ordering notes**: (a) `P0-01a` creates the `master` → `dev` branch model and the `origin` remote; every later atomic is cut from and merged back to `dev`. (b) `P0-02a` fixes the repository name `xVnDev/nestjs-ddd` established by `P0-01a`, so governance precedes planning. (c) `P0-02f` runs last because its link-integrity checker must see the complete planning tree written by `P0-02a` … `P0-02e` (and it is a separate script from `P01-10e`'s `docs:check`).

## DDD + SOLID lens for this step

- Use NestJS 12 first-party APIs over hand-rolled infrastructure.
- Config is small, typed and exported as `as Provider()` for async module options.
- No business rules in config, CI or docs; no secrets or PII committed.
- Tests use Vitest with `vi.fn()` mocks and faker fixtures.

## Step Summary

Initialize the `xVnDev/nestjs-ddd` repository with a protected `master`/`dev` branch model, CODEOWNERS and PR/issue governance, then scaffold the canonical `roadmap.md`, the phase/step plan tree, the planning index, the prompt templates and a link-integrity checker that proves every roadmap ID resolves to a plan.

## Atomic Tasks

### `P0-01a` — Initialize the git repository with master/dev branch model
- **Description**: Initialize the repository as `xVnDev/nestjs-ddd`, set `master` as the default stable branch and create `dev` from it as the integration branch. Add a root `.gitignore` for Node/NestJS artifacts (`node_modules`, `dist`, `.env`, coverage output) and a `.gitattributes` enforcing LF line endings so plans and source stay diff-stable across macOS and CI. Configure `origin` to the canonical remote URL. Atomic checks: (a) `master` and `dev` both exist with `dev` at the same initial commit, (b) `origin` points at `xVnDev/nestjs-ddd`, (c) `.env` is ignored. This is the prerequisite for every later atomic in both umbrellas.
- **CLI(s)**: `git init -b master`; `git remote add origin git@github.com:xVnDev/nestjs-ddd.git`; `git checkout -b dev`; `git status --short`.
- **Package(s)**: `None` — repository plumbing only, no npm install.
- **File(s)/Folder(s)**:
  - **Added**: `.gitignore`, `.gitattributes`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `chore/repo-initialize-nestjs-ddd` (shared with `P0-01b` … `P0-01e`)
- **Commit**: `chore(repo): initialize nestjs-ddd repository and branch model`
- **Testing**: Manual verification with `git branch --list` and `git remote -v`; `git check-ignore .env` confirms secrets are ignored. No code spec in this atomic; the planning-tree link check lands in `P0-02f`.

### `P0-01b` — Document branch protection and review policy
- **Description**: Add a governance document recording the protection rules to be applied to `master` and `dev` in GitHub settings: no force push, no direct pushes, required PR, at least one approving review, and required status checks (lint, typecheck, unit/E2E, coverage, security audit). State that task branches are cut from `dev` and merged only at a Phase Gate, per roadmap §7–§8. This is documentation of configuration performed in the GitHub UI — no business rules or secrets are encoded in the file. Atomic checks: (a) both branches have a rule table, (b) required checks named, (c) no tokens or credentials. Follows `P0-01a`.
- **CLI(s)**: `npm run docs:check` (added later by `P01-10e`; use the `P0-02f` link check before it exists).
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `.github/BRANCH_PROTECTION.md`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `chore/repo-initialize-nestjs-ddd` (shared)
- **Commit**: `chore(repo): document branch protection and review policy`
- **Testing**: Manual comparison against GitHub branch-protection settings; link-integrity check in `P0-02f` verifies the file resolves from the planning tree. No test code.

### `P0-01c` — Add CODEOWNERS for governance and planning files
- **Description**: Add `.github/CODEOWNERS` assigning `* @xVnDev` as the default owner and explicit ownership for the governance surfaces: `.github/`, `roadmap.md` and `.opencode/` (plans and prompts). This ensures changes to the canonical backlog and step plans require the repository owner's review. Keep the file to paths only, with no secrets or personal data beyond the GitHub handle. Atomic checks: (a) default owner present, (b) the three governance paths owned, (c) valid CODEOWNERS syntax. Follows `P0-01b`.
- **CLI(s)**: `git check-attr --all -- roadmap.md` (local syntax sanity); GitHub UI "-effective owners" preview.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `.github/CODEOWNERS`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `chore/repo-initialize-nestjs-ddd` (shared)
- **Commit**: `chore(repo): add codeowners for governance and planning files`
- **Testing**: Manual verification in the GitHub PR preview that ownership is requested for `roadmap.md` and `.opencode/**`; no test code.

### `P0-01d` — Add the pull request template with Phase Gate checklist
- **Description**: Add `.github/pull_request_template.md` with sections for summary, linked task ID (`P<phase>-<umbrella><letter>`), base branch reminder (`dev`), and a checklist mirroring roadmap §8: unit/E2E green, coverage thresholds, conformance specs for touched ports, no secrets/PII, lint/format/typecheck, security audit, and roadmap status updated. The checklist is process metadata, not a business rule and not executable CI. Atomic checks: (a) task-ID field present, (b) all eight gate items present, (c) no credentials in the template. Follows `P0-01c`.
- **CLI(s)**: `None`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `.github/pull_request_template.md`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `chore/repo-initialize-nestjs-ddd` (shared)
- **Commit**: `chore(repo): add pull request template with phase gate checklist`
- **Testing**: Manual preview of a new PR to confirm the template renders; link check in `P0-02f`. No test code.

### `P0-01e` — Add issue templates and issue-form configuration
- **Description**: Add bug-report and feature-request issue forms under `.github/ISSUE_TEMPLATE/` plus `config.yml` with a link to private security reporting (placeholder `security@` address, no real contact secret). Capture structured fields for reproduction steps, affected phase/task ID and expected behaviour so issues map cleanly onto roadmap IDs. Do not duplicate the SECURITY.md policy added later in `P01-10c`. Atomic checks: (a) two forms plus config exist, (b) every form has a task-ID field, (c) no real contact secrets. Follows `P0-01d` and completes the `P0-01` umbrella.
- **CLI(s)**: `None`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `.github/ISSUE_TEMPLATE/bug_report.yml`, `.github/ISSUE_TEMPLATE/feature_request.yml`, `.github/ISSUE_TEMPLATE/config.yml`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `chore/repo-initialize-nestjs-ddd` (shared)
- **Commit**: `chore(repo): add issue templates and issue form config`
- **Testing**: Manual "new issue" preview of both forms; YAML syntax reviewed; link check in `P0-02f`. No test code.

### `P0-02a` — Create roadmap.md document control, vision and canonical backlog
- **Description**: Create `roadmap.md` as the single source of truth with Document Control (project `nestjs-ddd`, repository `xVnDev/nestjs-ddd`, branch model, framework NestJS 12, compliance targets), Vision & Scope, Architecture Thesis, Technology Baseline and the canonical §4 backlog listing every umbrella ID from `P0-01` through `P10-03` with status ⬜ Planned. Do not add business rules or implementation detail — the backlog records *what* and *in what order* only. Atomic checks: (a) document control names the repo from `P0-01a`, (b) all IDs `P0-01`…`P10-03` appear exactly once, (c) no secrets or PII. This is the first `P0-02` atomic and unblocks all later planning atomics.
- **CLI(s)**: `mkdir -p .opencode/plans .opencode/prompts scripts`; `grep -c 'P10-03' roadmap.md`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `roadmap.md`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `chore/plan-scaffold-nestjs-ddd` (shared with `P0-02b` … `P0-02f`)
- **Commit**: `chore(plan): add roadmap document control, vision and canonical backlog`
- **Testing**: Link-integrity checker from `P0-02f` asserts every §4 ID is unique; `scripts/check-plan-links.spec.ts` includes an ID-uniqueness case. No application spec in this atomic.

### `P0-02b` — Add conventions, layer map and phase exit criteria to roadmap
- **Description**: Append §5 Conventions & Guardrails (layer map with `domain/`, `application/`, `infrastructure/`, `interfaces/`; port/adapter rules with `src/modules/shared/` tokens; SOLID mapping; reference `src/` shape; non-negotiable practices) and §6 Phase Plan with the P0–P10 outcome table plus §6.1 exit criteria. Keep the content prescriptive about structure only — no business rules, no secret values, no PII. Atomic checks: (a) all five §5 sub-sections present, (b) all ten phases and their exit criteria present, (c) `as Provider()` and `vi.fn()` conventions stated. Follows `P0-02a`.
- **CLI(s)**: `None`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `None`
  - **Modified**: `roadmap.md`
  - **Deleted**: `None`
- **Branch**: `chore/plan-scaffold-nestjs-ddd` (shared)
- **Commit**: `chore(plan): add ddd conventions and phase exit criteria to roadmap`
- **Testing**: Manual review against §6.1; link check in `P0-02f`. No test code.

### `P0-02c` — Add execution order, gates, testing and compliance traceability to roadmap
- **Description**: Append §7 Execution Order & Parallelism (strict `P0 → P01 → … → P05`, parallel `P06 ∥ P07`, sequential `P08 → P09 → P10`), §8 Phase Gate / Definition of Done, §9 Testing Strategy, §10 Branching/Commits/Release, §11 Security & Compliance Traceability with a code-location column, §12 Risk Register, §13 Glossary and §14 Planning System Map. Ensure §11 references only planned code locations (e.g. `src/main.ts`, `src/modules/security/`) and contains no real credentials. Atomic checks: (a) §7–§14 present in order, (b) traceability rows name a concrete code location, (c) no secrets. Follows `P0-02b`.
- **CLI(s)**: `None`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `None`
  - **Modified**: `roadmap.md`
  - **Deleted**: `None`
- **Branch**: `chore/plan-scaffold-nestjs-ddd` (shared)
- **Commit**: `chore(plan): add execution order, gates and compliance traceability to roadmap`
- **Testing**: `scripts/check-plan-links.spec.ts` verifies §14 paths resolve; manual check that each §11 row has a location. No application spec.

### `P0-02d` — Create the planning index
- **Description**: Create `.opencode/plans/INDEX.md` as navigation only: one row per phase linking to each step plan file that exists in the tree (P0 Step 1, P01 Steps 1–3, P02 Steps 1–2, P03 Steps 1–4, P04 Steps 1–2, P05 Steps 1–3, P06 Steps 1–2, P07 Steps 1–3, P08 Steps 1–4, P09 Steps 1–3, P10 Step 1). State that `roadmap.md` is the canonical source and the index only navigates. Atomic checks: (a) every phase present, (b) every link target exists on disk, (c) no duplicate links. Follows `P0-02c`; the Prompts section is added by `P0-02e`.
- **CLI(s)**: `npm run plans:check` (wired in `P0-02f`; run with `node scripts/check-plan-links.mjs` before then).
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `.opencode/plans/INDEX.md`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `chore/plan-scaffold-nestjs-ddd` (shared)
- **Commit**: `chore(plan): add planning index linking every phase step plan`
- **Testing**: Link-integrity checker in `P0-02f` must resolve every index link; `scripts/check-plan-links.spec.ts` has a case for missing index targets.

### `P0-02e` — Create the roadmap-step and phase-gate prompt templates
- **Description**: Add `.opencode/prompts/roadmap-step.md` (instructions to break down the active step into atomic 7-field tasks — `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing` — one commit per atomic, shared branch per umbrella) and `.opencode/prompts/phase-gate.md` (instructions to run the roadmap §8 checklist, update §4 statuses and re-check §6.1). Append a Prompts section to the index linking both files. Atomic checks: (a) both prompt files exist, (b) index links resolve, (c) prompts reference the canonical roadmap, not a competing source. Follows `P0-02d`.
- **CLI(s)**: `node scripts/check-plan-links.mjs`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `.opencode/prompts/roadmap-step.md`, `.opencode/prompts/phase-gate.md`
  - **Modified**: `.opencode/plans/INDEX.md` (Prompts section)
  - **Deleted**: `None`
- **Branch**: `chore/plan-scaffold-nestjs-ddd` (shared)
- **Commit**: `chore(plan): add roadmap step and phase gate prompt templates`
- **Testing**: Link check resolves both prompt links; manual review that the 7 fields match the exemplar in `.opencode/plans/phase-01-foundation/step-3-api-docs-and-project-policies.md`.

### `P0-02f` — Add and run the planning-tree link-integrity checker
- **Description**: Add `scripts/check-plan-links.mjs` using Node built-ins only to verify that (a) every relative link in `roadmap.md`, `.opencode/plans/INDEX.md` and `.opencode/plans/**/*.md` resolves to an existing file, (b) every §4 umbrella ID `P0-01`…`P10-03` appears exactly once, and (c) every phase in §6 has at least one step plan. Wire it as the `plans:check` npm script — deliberately distinct from `P01-10e`'s `docs:check`, which covers README/SECURITY/CHANGELOG. Run it and fix any broken links found. Atomic checks: (a) script wired in `package.json`, (b) fails on a deliberately broken link (self-test), (c) passes on the finished tree. This is the final atomic of `P0-02` and of the whole step.
- **CLI(s)**: `node scripts/check-plan-links.mjs`; self-test by temporarily inserting a broken link. (The `plans:check` npm script is wired later in `P01-01a`, once `package.json` exists.)
- **Package(s)**: `None` — Node built-ins only (`node:fs`, `node:path`).
- **File(s)/Folder(s)**:
  - **Added**: `scripts/check-plan-links.mjs`, `scripts/check-plan-links.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `chore/plan-scaffold-nestjs-ddd` (shared)
- **Commit**: `chore(plan): add planning-tree link integrity checker`
- **Testing**: `scripts/check-plan-links.spec.ts` unit-tests the link extractor and ID-uniqueness check with `vi.fn()` on `fs` reads; negative self-test proves the checker exits non-zero on a broken link; final `npm run plans:check` passes.

## Phase Gate (end of step)

- [x] Full unit tests + coverage thresholds pass (link-checker spec included).
- [x] `node scripts/check-plan-links.mjs` green; every roadmap ID and index link resolves.
- [x] Branch model, branch protection, CODEOWNERS, PR and issue templates verified against roadmap §7–§8.
- [x] Lint/format/typecheck clean; security audit & version sync run.
- [x] Each atomic commit pushed on its shared branch; PRs merged into `dev` in this exact order:
  `P0-01a` → `P0-01b` → `P0-01c` → `P0-01d` → `P0-01e` → `P0-02a` → `P0-02b` → `P0-02c` → `P0-02d` → `P0-02e` → `P0-02f`.
- [x] Status for umbrella IDs `P0-01`, `P0-02` set to `✅ Done` in [`roadmap.md`](../../../roadmap.md) §4 (atomic IDs tracked here).
- [x] Re-check the P0 exit criterion in [`roadmap.md`](../../../roadmap.md) §6.1 before starting P01.
