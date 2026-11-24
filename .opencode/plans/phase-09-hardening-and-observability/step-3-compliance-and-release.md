# P09 · Step 3 — Compliance & Release

**Project:** nestjs-ddd  |  **Phase:** P09 — Hardening & Observability  |  **Base branch:** `dev`  |  **Status:** ⬜ Planned

> Source of truth: [`roadmap.md`](../../../roadmap.md) §4. Umbrella IDs `P09-09`, `P09-10` stay in the roadmap; this file lists the final atomic split (`P09-09a` … `P09-10d`).
> **Format**: `P<phase>-<umbrella><letter>` — one atomic task = one commit; sibling atomic tasks share one branch (branch per umbrella task). Every atomic task uses the 7-field format: `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing`.
> **Ordering notes**: (a) `P09-09a` creates the document skeleton containing **all nine** control rows from roadmap §11; `P09-09b`…`P09-09d` fill in the four standards columns one standard at a time; `P09-09e` closes with residual gaps and an automated reconciler. (b) Every row must be reconciled against ISO/IEC 27001:2022 Annex A, OWASP ASVS 4.0 L2, HIPAA Security Rule §164.312 and GDPR Art. 32 before release. (c) `P09-10` runs **only after** `P09-09` is merged; within it, the `v1.0.0` tag is created exclusively by `P09-10d` — no earlier atomic, step or phase may tag. (d) P09 exits only when both atomics groups are merged and the §6.1 exit criterion is re-checked.
> **Correctness invariants**: the compliance doc reconciles **every** §11 row with code evidence and records residual gaps (`P09-09a`…`P09-09e`); the `v1.0.0` tag exists only after `P09-10d` and the badge/version/CHANGELOG all agree (`P09-10a`…`P09-10d`).

## DDD + SOLID lens for this step

- Bounded contexts own `domain/`, `application/`, `infrastructure/`, `interfaces/`; dependencies point inward.
- Domain/application depend only on port tokens; adapters are injected, never imported directly.
- Every port ships one conformance spec run against all adapters, including in-memory fallbacks.
- Business rules live in entities/value objects/use cases; controllers stay thin.
- Introduce a port only when a mechanism must be swappable or isolated for tests.

## Step Summary

Produce a compliance traceability document that maps every shipped control in roadmap §11 to ISO 27001:2022, OWASP ASVS 4.0 L2, HIPAA §164.312 and GDPR Art. 32 with concrete code evidence and recorded residual gaps, then perform the single controlled release that bumps the version, updates the badge and creates the `v1.0.0` tag — split into small individually committable atomics.

## Atomic Tasks

### `P09-09a` — Create the compliance document with all §11 rows
- **Description**: Create `docs/security/compliance-mapping.md` containing a traceability table with one row for every control in roadmap §11 (nine rows, from Argon2id through dependency/SAST pipelines) and the columns Control, ISO 27001:2022, OWASP ASVS 4.0 L2, HIPAA §164.312, GDPR, Code location and Evidence. Copy the control names and standard references verbatim from roadmap §11 as a starting skeleton; leave evidence cells marked `TBD` for the following atomics to fill. Atomic checks: (a) exactly nine control rows present, (b) all four standards columns present, (c) no row dropped or renamed from §11.
- **CLI(s)**: `npm run docs:check`; `npm run test:unit -- compliance`.
- **Package(s)**: `None` — reuses the `docs:check` script from `P01-10e`.
- **File(s)/Folder(s)**:
  - **Added**: `docs/security/compliance-mapping.md`, `docs/security/compliance-mapping.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `docs/sec-compliance-mapping` (shared with `P09-09b`, `P09-09c`, `P09-09d`, `P09-09e`)
- **Commit**: `docs(sec): scaffold compliance mapping with all roadmap 11 controls`
- **Testing**: Spec parses the doc table and asserts a one-to-one match with the nine control names in roadmap §11 and that all standard columns/Evidence exist; doc link check passes; coverage thresholds pass.

### `P09-09b` — Fill ISO 27001:2022 Annex A evidence
- **Description**: For each of the nine rows, populate the ISO 27001:2022 column with the exact Annex A control reference from roadmap §11 (e.g. A.5.15/A.8.24, A.8.20, A.8.29, A.8.23, A.8.15/A.5.17, A.8.8) and add an Evidence cell citing the concrete implementation file(s) and the spec that proves it. Keep references faithful to §11 — do not invent controls. Atomic checks: (a) nine ISO cells non-empty, (b) references match §11 exactly, (c) each cites a real code path.
- **CLI(s)**: `npm run docs:check`; `npm run test:unit -- compliance`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `None`
  - **Modified**: `docs/security/compliance-mapping.md`, `docs/security/compliance-mapping.spec.ts`
  - **Deleted**: `None`
- **Branch**: `docs/sec-compliance-mapping` (shared)
- **Commit**: `docs(sec): fill iso 27001 annex a evidence for every control`
- **Testing**: Spec asserts every row has a non-`TBD` ISO cell with a valid `A.<n>.<n>` reference matching §11 and that referenced files exist; coverage thresholds pass.

### `P09-09c` — Fill OWASP ASVS 4.0 L2 evidence
- **Description**: Populate the OWASP ASVS 4.0 column for all nine rows using the exact V-numbers from roadmap §11 (V2.1, V14.4, V5.1, V8.3, V3.5/V3.3, V2.8, V11.1, V7.2, V14.2) and cite the implementing spec/adapter for each. Add a note stating the target level is L2 and that any deviation is captured as a residual gap in `P09-09e`. Atomic checks: (a) nine ASVS cells non-empty, (b) V-numbers match §11, (c) evidence cites a test file where applicable.
- **CLI(s)**: `npm run docs:check`; `npm run test:unit -- compliance`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `None`
  - **Modified**: `docs/security/compliance-mapping.md`, `docs/security/compliance-mapping.spec.ts`
  - **Deleted**: `None`
- **Branch**: `docs/sec-compliance-mapping` (shared)
- **Commit**: `docs(sec): fill owasp asvs 4.0 l2 evidence for every control`
- **Testing**: Spec asserts every row has a valid `V<n>.<n>` reference matching §11 and a non-empty evidence cell; coverage thresholds pass.

### `P09-09d` — Fill HIPAA §164.312 and GDPR Art. 32 evidence
- **Description**: Populate the HIPAA Security Rule §164.312 column and GDPR column for all nine rows with the references from roadmap §11 (e.g. (d) Access Control / (e) Transmission / (c) Integrity / (a)(2)(iv) / (b) Audit controls and Art. 32(1)(a)–(d)). Add an Evidence note naming the code location for each, including the field-encryption-at-rest and audit-log controls from `P09-04`/`P08-10`. Atomic checks: (a) nine HIPAA cells and nine GDPR cells non-empty, (b) references match §11, (c) no row left with `TBD`.
- **CLI(s)**: `npm run docs:check`; `npm run test:unit -- compliance`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `None`
  - **Modified**: `docs/security/compliance-mapping.md`, `docs/security/compliance-mapping.spec.ts`
  - **Deleted**: `None`
- **Branch**: `docs/sec-compliance-mapping` (shared)
- **Commit**: `docs(sec): fill hipaa 164.312 and gdpr art 32 evidence`
- **Testing**: Spec asserts every row has non-`TBD` HIPAA and GDPR cells matching §11 and that cited code paths exist; coverage thresholds pass.

### `P09-09e` — Record residual gaps and add an automated reconciler
- **Description**: Add a `Residual gaps & waivers` section listing any control that is partially implemented or out of scope, with owner, risk and mitigation, so nothing is silently claimed as complete. Add a Node script `scripts/check-compliance.mjs` (no new deps) that parses roadmap §11 and the doc, failing if any control row is missing or any standards/evidence cell is `TBD`/empty, and wire it as `npm run compliance:check`. Atomic checks: (a) residual-gaps section present, (b) reconciler fails on a deliberately blanked cell (self-test), (c) reconciler passes on the committed doc.
- **CLI(s)**: `npm pkg set scripts.compliance:check="node scripts/check-compliance.mjs"`; `npm run compliance:check`; negative self-test by temporarily blanking one cell.
- **Package(s)**: `None` — Node built-ins only (`node:fs`, `node:path`).
- **File(s)/Folder(s)**:
  - **Added**: `scripts/check-compliance.mjs`, `scripts/check-compliance.spec.ts`
  - **Modified**: `docs/security/compliance-mapping.md`, `docs/security/compliance-mapping.spec.ts`, `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `docs/sec-compliance-mapping` (shared)
- **Commit**: `docs(sec): add residual gaps and compliance reconciliation check`
- **Testing**: `check-compliance.spec.ts` uses `vi.fn()` on `fs.readFileSync` to assert failure on missing/`TBD` cells and success on the real doc; negative self-test proves it fails; final `npm run compliance:check` passes; coverage thresholds pass.

### `P09-10a` — Bump package version to 1.0.0 and add the CHANGELOG release entry
- **Description**: Set `version` to `1.0.0` in `package.json`/lockfile and convert the `1.0.0-rc.0` entry in `CHANGELOG.md` into a `1.0.0` release section (Keep a Changelog, Added/Changed/Security groups) with the release date, without creating any git tag. Keep an `Unreleased` section at the top. Atomic checks: (a) version is exactly `1.0.0`, (b) CHANGELOG has a `1.0.0` section, (c) no tag created in this atomic.
- **CLI(s)**: `npm version 1.0.0 --no-git-tag-version`; `npm pkg get version`; `npm run docs:check`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `None`
  - **Modified**: `package.json`, `package-lock.json`, `CHANGELOG.md`
  - **Deleted**: `None`
- **Branch**: `chore/release-v1-0-0` (shared with `P09-10b`, `P09-10c`, `P09-10d`)
- **Commit**: `chore(release): bump version to 1.0.0 and add changelog entry`
- **Testing**: Version-consistency spec asserts `package.json`, lockfile and CHANGELOG agree on `1.0.0`; doc link check passes; coverage thresholds pass. No tag assertion here.

### `P09-10b` — Update the README version badge to 1.0.0
- **Description**: Update the version badge in `README.md` (created in `P01-10a`) so it reads `1.0.0` and add/keep the note that it must track `package.json`. Verify no other doc still advertises the rc version. Atomic checks: (a) badge reads `1.0.0`, (b) badge value equals `package.json` version, (c) no stale rc references in docs.
- **CLI(s)**: `npm pkg get version`; `npm run docs:check`; `grep -R "1.0.0-rc" docs README.md CHANGELOG.md` (expect no matches in docs).
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `None`
  - **Modified**: `README.md`, `docs/security/compliance-mapping.spec.ts`
  - **Deleted**: `None`
- **Branch**: `chore/release-v1-0-0` (shared)
- **Commit**: `chore(release): update readme version badge to 1.0.0`
- **Testing**: Spec asserts the badge string matches `package.json` version and that no doc contains `1.0.0-rc.0`; doc link check passes; coverage thresholds pass.

### `P09-10c` — Add and run the release verification checklist
- **Description**: Add a release checklist doc/script that verifies, before tagging: unit + E2E + coverage green, `npm run compliance:check` green, badge/CHANGELOG/version all `1.0.0`, no secrets or PII in the working tree, and that **no `v1.0.0` tag exists yet**. Add a Node script `scripts/check-release.mjs` wired as `npm run release:check`; run it and require all checks green. Atomic checks: (a) all checks present, (b) script fails if a `v1.0.0` tag already exists (idempotence guard), (c) script passes on the current tree.
- **CLI(s)**: `npm pkg set scripts.release:check="node scripts/check-release.mjs"`; `npm run release:check`; `git tag --list 'v1.0.0'` (expect empty before `P09-10d`).
- **Package(s)**: `None` — Node built-ins only, plus existing npm scripts.
- **File(s)/Folder(s)**:
  - **Added**: `scripts/check-release.mjs`, `scripts/check-release.spec.ts`, `docs/release/checklist.md`
  - **Modified**: `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `chore/release-v1-0-0` (shared)
- **Commit**: `chore(release): add automated release verification checklist`
- **Testing**: `check-release.spec.ts` uses `vi.fn()` on `child_process`/`fs` to assert failure on wrong version, existing tag or leaked secret and success on a clean state; final `npm run release:check` passes; coverage thresholds pass.

### `P09-10d` — Create and push the v1.0.0 tag
- **Description**: This is the **only** atomic in the entire roadmap permitted to create the release tag. After the PR for `P09-10a`…`P09-10c` is merged into `dev` and `release:check` is green, create an annotated tag `v1.0.0` on that merge commit with a message referencing the CHANGELOG entry, then push it. Verify `git tag --list` shows exactly one `v1.0.0` and that no earlier commit carries it. Atomic checks: (a) annotated tag exists on the release merge commit, (b) exactly one `v1.0.0` tag, (c) badge/version/tag all agree.
- **CLI(s)**: `git tag -a v1.0.0 -m "nestjs-ddd v1.0.0 — see CHANGELOG.md"`; `git push origin v1.0.0`; `git tag --list 'v1.0.0'`; `npm run release:check`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `None`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `chore/release-v1-0-0` (shared)
- **Commit**: `chore(release): tag v1.0.0`
- **Testing**: Release verification checklist re-run after tagging asserts version/badge/tag consistency; `git tag --list` asserts exactly one tag; no unit code changes so coverage thresholds remain unchanged.

## Phase Gate (end of step)

- [ ] Full unit tests + coverage thresholds pass; lint/format/typecheck clean.
- [ ] `npm run compliance:check` passes with all nine §11 controls reconciled across ISO 27001:2022, OWASP ASVS 4.0 L2, HIPAA §164.312 and GDPR Art. 32, with residual gaps recorded.
- [ ] `npm run docs:check` passes; version/badge/CHANGELOG/tag all read `1.0.0`.
- [ ] No secrets or PII committed; security audit & version sync pass.
- [ ] Each atomic commit pushed on its shared branch; PRs merged into `dev` in this exact order:
  `P09-09a` → `P09-09b` → `P09-09c` → `P09-09d` → `P09-09e` → `P09-10a` → `P09-10b` → `P09-10c` → `P09-10d`.
- [ ] `v1.0.0` was created **only** by `P09-10d` and is the sole release tag.
- [ ] Status for umbrella IDs `P09-09`, `P09-10` set to `✅ Done` in [`roadmap.md`](../../../roadmap.md) §4 (atomic IDs tracked here).
- [ ] Re-check the P09 exit criterion in [`roadmap.md`](../../../roadmap.md) §6.1 — control mapping complete, metrics/alerts live, `v1.0.0` tagged — before starting P10.
