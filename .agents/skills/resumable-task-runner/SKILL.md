---
name: resumable-task-runner
description: Execute a documented backlog of tasks one at a time, ticking each off in the task file and logging everything to a progress.md tracking file so work survives across sessions. Use this whenever the user points at a set of project documents, a task list, a backlog, a spec folder, or a build plan and asks to "work through it", "do these tasks", "start building this", "continue where we left off", "resume", or "pick up where you stopped" — and especially any time a progress.md, PROJECT_TASKS.md, TASKS.md, or TODO.md already exists in the working directory. Also use it whenever a long multi-step build or migration might span more than one session, even if the user does not mention tracking or resuming.
---

# Resumable Task Runner

Work through a documented backlog one task at a time, leaving behind a trail complete enough that a future session — with no memory of this one — can pick up exactly where it stopped.

The hard part is not executing tasks. It is making the handoff between sessions reliable. Most of this skill is about that.

## Core loop

```
Session start  ──> read progress.md ──> verify reality ──> pick next task
                                                                │
        ┌───────────────────────────────────────────────────────┘
        v
  mark IN PROGRESS ──> read docs ──> implementation_plan.md ──> STOP for user approval
                                                                        │
        ┌───────────────────────────────────────────────────────────────┘
        v
     execute ──> verify criteria ──> tick task file ──> log to progress.md
```

## 1. Session start

Do this before touching anything else, every session, without being asked.

1. **Read `progress.md`** if it exists. Its "Resume here" block tells you the next task and whether the last session ended cleanly.
2. **Check for an interrupted task.** If any task is marked `IN PROGRESS` in progress.md, the previous session died mid-task. Do not assume it finished. Go to §5.

   Task files usually have only `Pending` and `Done` — there is no third state to crash into. That makes progress.md the *only* place an interruption is visible, which is why §3 says to mark `IN PROGRESS` before starting work rather than after.
3. **Verify reality against the log.** Spot-check that the last two completed tasks actually produced the files the log claims. A log entry is a claim, not proof — a session can crash between writing a file and writing the log, or the reverse.
4. **Read the governing documents** the next task depends on. Do not re-read the entire document set every session; the task entry names what it needs.
5. **Confirm the project still builds or runs** before changing anything, if that's meaningful for this project. Discovering a pre-existing breakage after you've made ten edits is expensive.
6. **Report to the user** in three lines: where things stand, what you're picking up, anything that looks wrong.

If `progress.md` does not exist, this is a first session — go to §2.

## 2. First session bootstrap

1. Read every provided document. Identify which one is the task list.
2. **If there is no task list**, build one before executing anything. Derive tasks from the specs, give each an ID, dependencies, priority, and acceptance criteria, then show it to the user and get agreement. Executing against an unwritten list is how scope silently drifts.
3. Create `progress.md` from `assets/progress-template.md`.
4. Record the task list's location and total task count in progress.md.
5. Start at the first task with no unmet dependencies.

## 3. Executing one task

**One task at a time, start to finish.** Do not begin a second task because the first is "basically done". Half-finished parallel work is exactly what makes a session unrecoverable.

**Before starting:**
- Confirm every dependency is `Done`. If not, pick a different task and say why.
- Mark the task `IN PROGRESS` in progress.md **before** you begin, with a timestamp. This is what lets a future session detect a crash.
- Read the documents this task references.
- Create or update the `implementation_plan.md` artifact with `RequestFeedback: true` detailing:
  - User review required and open questions
  - Proposed changes (exact files to create/modify/delete)
  - Verification plan (automated checks, lint, checklists)
- **STOP and wait for the user's explicit approval before proceeding to execution.** Never modify or create code files without an approved plan.

**While executing:**
- Follow whatever conventions the project's own documents specify. This skill governs *process*; the project's documents govern *content*, and they win on any question of how the work itself should be done.
- If the spec is ambiguous, pick the more conservative reading, proceed, and record the assumption. Do not stall on small ambiguities; do not silently invent scope on large ones.
- If the task turns out to be much bigger than described, stop and propose splitting it before you're three files deep.

**Before marking done:**
- Check each acceptance criterion explicitly, one by one. "It looks right" is not verification.
- Run whatever check the project defines — tests, a build, a checklist.
- If a criterion fails, the task is not done. Either fix it or mark the task `BLOCKED` with the reason.

## 4. Recording completion

Two files change, in this order:

**First, the task file.** Tick the task. Match the file's existing convention:

| If the file uses | Mark it |
|---|---|
| `- [ ] TASK-005 ...` | `- [x] TASK-005 ...` |
| A `Status` column with `Pending` | `✅ Done` |
| `Status: Pending` lines | `Status: ✅ Done` |

Preserve the file's existing format. Do not restructure someone's task file while ticking a box.

**Second, `progress.md`.** Append a log entry and update the "Resume here" block and the counts.

Doing the task file first matters: if something interrupts you between the two writes, an untick with a log entry is easy to spot and fix, whereas a tick with no log entry loses the context permanently.

## 5. Recovering an interrupted task

When session start finds a task marked `IN PROGRESS`:

1. **Do not trust it either way.** It may be untouched, half done, or actually complete.
2. Read the task's acceptance criteria.
3. Inspect the actual state — which files exist, what they contain, whether the code compiles.
4. Decide and say which one it is:
   - **Untouched** → reset to `Pending`, start fresh.
   - **Partially done** → either finish it or roll the partial work back. Prefer finishing when the partial work is coherent; prefer rolling back when it's scattered across several files in an unclear state.
   - **Actually complete** → verify the criteria, then mark it done properly.
5. Log what you found under "Recovery" in progress.md. A future session — and the user — needs to know a crash happened and how it was resolved.

## 6. progress.md structure

Use `assets/progress-template.md`. The five sections each earn their place:

- **Resume here** — the first thing a new session reads. Keep it to a few lines so resuming is cheap. It must always reflect the true current state.
- **Progress summary** — counts and per-group completion, so the user can see the shape of the work without reading the log.
- **Open questions** — ambiguities and contradictions found but not resolved. These must survive session boundaries; otherwise every session rediscovers the same problem.
- **Log** — one entry per task, newest last. This is the audit trail.
- **Recovery** — crash and rollback events. Rare, and important when it isn't.

**Write log entries for a stranger.** The reader has no memory of this session. "Fixed the bug" is useless. "Attendance percentage was counting holidays; excluded them in `lib/utils/attendance.ts`" is useful.

**Keep it append-only in spirit.** Never delete or rewrite history in the log. Correct a past entry by adding a new one that references it.

## 7. Session end

When stopping — because the work is done, the user is wrapping up, or a limit is near:

- Finish or explicitly park the current task. Never leave a task silently mid-flight.
- If parking, write down exactly what remains, in enough detail to resume without rereading everything.
- Update "Resume here" and mark the stop as clean.
- Tell the user what got done, what's next, and anything you're unsure about.

If a session might end without warning, keeping "Resume here" accurate after every task is what makes that survivable.

## 8. Reporting to the user

After each task, briefly: what was built, files changed, decisions made, anything left open. Do not paste the whole log entry into chat — it's in the file.

Periodically — every fifth task or so, or at natural boundaries — give a short status: tasks done out of total, what's coming, anything accumulating in Open questions that needs a decision.

**Surface blockers immediately, not at session end.** A blocked task the user could have unblocked in thirty seconds should not sit idle for an hour.

## 9. Things that go wrong

| Symptom | What's actually happening | Response |
|---|---|---|
| Log says done, artifact missing | Crash between the two writes | Reopen the task, verify, redo the missing part |
| Task file says Done, progress.md has no entry | Crash between the two writes | Reconstruct the log entry from what's on disk, and say in it that it was reconstructed |
| Task file says Pending, progress.md says In progress | Normal crash signature, not a conflict | Follow §5 — inspect the real state and decide |
| Task file and progress.md disagree otherwise | One write failed | Neither file is authoritative. What is actually on disk is. Reconcile both to match reality |
| Same open question raised repeatedly | It was never escalated | Escalate to the user now |
| Tasks completing suspiciously fast | Acceptance criteria are being skimmed | Re-verify the last few against their criteria |
| Dependencies keep blocking | Task order is wrong for reality | Propose a reorder rather than working around it repeatedly |

## 10. What this skill does not do

It does not decide *what* to build — the project's documents do. If they're ambiguous, contradictory, or missing something needed, say so and add it to Open questions rather than filling the gap by invention.

It does not measure success by tasks closed. A task ticked without meeting its acceptance criteria is worse than one left open, because it removes the signal that the work still needs doing.
