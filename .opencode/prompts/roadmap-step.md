# Roadmap Step Prompt

Canonical source: `roadmap.md`.

Break down the active step into atomic tasks. Each atomic task must include exactly these seven fields:

1. **Description**
2. **CLI(s)**
3. **Package(s)**
4. **File(s)/Folder(s)** — Added / Modified / Deleted
5. **Branch**
6. **Commit**
7. **Testing**

Rules:
- One atomic = one commit.
- Atomic siblings share one branch per umbrella task.
- Reference the umbrella ID and step plan in `.opencode/plans/`.
- Do not add business rules or implementation detail beyond structure.
- Update `.opencode/plans/INDEX.md` if new step plans are added.
