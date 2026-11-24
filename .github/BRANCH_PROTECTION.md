# Branch Protection and Review Policy

This document records the protection rules applied to the `master` and `dev`
branches through the GitHub branch-protection settings. It is configuration
documentation only: it contains no business rules, secrets, or credentials.

## General rules (both branches)

- Force pushes are disabled.
- Direct pushes are disabled; all changes must arrive through a pull request.
- At least one approving review is required before merge.
- Required status checks must pass before merge.
- Branches are not deleted on merge.

## Required status checks

The following checks are required on both protected branches:

| Check | Description |
| --- | --- |
| `lint` | Linting (oxlint / eslint) |
| `typecheck` | TypeScript type checking |
| `unit` | Unit test suite |
| `e2e` | End-to-end test suite |
| `coverage` | Coverage thresholds |
| `security-audit` | Dependency security audit |

## Branch rules

### `master`

| Rule | Value |
| --- | --- |
| Force push | Disabled |
| Direct push | Disabled |
| Pull request required | Yes |
| Approving reviews required | At least 1 |
| Required status checks | `lint`, `typecheck`, `unit`, `e2e`, `coverage`, `security-audit` |
| Restrict deletions | Yes |

### `dev`

| Rule | Value |
| --- | --- |
| Force push | Disabled |
| Direct push | Disabled |
| Pull request required | Yes |
| Approving reviews required | At least 1 |
| Required status checks | `lint`, `typecheck`, `unit`, `e2e`, `coverage`, `security-audit` |
| Restrict deletions | Yes |

## Branching workflow

- Task branches are cut from `dev`.
- Task branches are merged back into `dev` through pull requests.
- Promotion to `master` happens only at a Phase Gate, per roadmap sections 7-8.
- No task branch may be merged directly into `master`.
