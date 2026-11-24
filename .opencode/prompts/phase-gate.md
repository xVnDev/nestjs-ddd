# Phase Gate Prompt

Canonical source: `roadmap.md` (§8).

Run the §8 checklist against the current step:
- Step tasks match the canonical backlog and step plan.
- Unit tests pass; domain/use cases tested with ports mocked via `vi.fn()`.
- E2E tests pass at the interfaces layer, including in-memory fallback path.
- Coverage thresholds met; conformance specs pass for touched ports.
- Typed config validated; no secrets or PII committed.
- Lint, format, typecheck clean.
- Package security audit and version sync executed.
- Step branch pushed, PR opened and merged into `dev`.
- Backlog status and step plan updated; phase exit criteria re-checked (§6.1).

Update §4 statuses and re-check §6.1 exit criteria. Do not start the next step until green.
