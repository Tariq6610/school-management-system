# School Management System — Agent Directives

For complete agent specifications, refer to [context/AGENTS.md](file:///run/media/tariq/SharedData/MyPrograms/My%20Projects/school%20management%20system/context/AGENTS.md).

## Mandatory Execution Rules

1. **Plan Before Execution**: For every task from [context/PROJECT_TASKS.md](file:///run/media/tariq/SharedData/MyPrograms/My%20Projects/school%20management%20system/context/PROJECT_TASKS.md), you MUST generate a formal implementation plan artifact (`implementation_plan.md`) with `RequestFeedback: true` detailing:
   - Target task and acceptance criteria
   - Specific files to create, modify, or delete
   - Architectural decisions & design system usage
   - Verification plan (lint, build, testing checklist)
   - **STOP and wait for explicit user approval before writing or modifying any code.**

2. **One Task at a Time**:
   - Mark the task `IN PROGRESS` in [progress.md](file:///run/media/tariq/SharedData/MyPrograms/My%20Projects/school%20management%20system/progress.md) before starting.
   - Execute strictly against the approved plan.
   - Verify every acceptance criterion explicitly.
   - Mark `Done` in [context/PROJECT_TASKS.md](file:///run/media/tariq/SharedData/MyPrograms/My%20Projects/school%20management%20system/context/PROJECT_TASKS.md), update [progress.md](file:///run/media/tariq/SharedData/MyPrograms/My%20Projects/school%20management%20system/progress.md) log, and update [context/CHANGELOG.md](file:///run/media/tariq/SharedData/MyPrograms/My%20Projects/school%20management%20system/context/CHANGELOG.md).

3. **No Direct `localStorage` Access**:
   - `localStorage` is ONLY touched inside `frontend/src/lib/storage/`.
   - All components call `frontend/src/lib/repositories/` using `async` functions with explicit scope objects (`{ schoolId, campusId }`).
