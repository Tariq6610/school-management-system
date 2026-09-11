# School Platform Prototype — Documentation Set

This folder is the complete specification for a **clickable, frontend-only prototype** of the School Management Platform. It is written to be read by an AI coding agent, and by the humans reviewing that agent's work.

Nothing here describes production software. There is no backend, no database, and no API. Everything runs in the browser on `localStorage`.

---

## Read in this order

| # | File | What it answers |
|---|---|---|
| 1 | **AGENTS.md** | How the agent works. Read first, every session. |
| 2 | **PROJECT_OVERVIEW.md** | What we are building and, more importantly, what this prototype can and cannot prove. |
| 3 | **PRODUCT_REQUIREMENTS.md** | Roles, permissions, modules. |
| 4 | **FEATURE_SPECIFICATIONS.md** | Exact behaviour of each screen and flow. |
| 5 | **DATA_MODELS.md** | Storage schemas, key naming, seed data, size limits. |
| 6 | **ROUTE_STRUCTURE.md** | Every page and its access rules. |
| 7 | **UI_DESIGN_SYSTEM.md** | Tokens, typography, components, interaction patterns. |
| 8 | **COMPONENT_STRUCTURE.md** | Component tree and contracts. |
| 9 | **DEVELOPMENT_GUIDELINES.md** | Coding rules. Contains the one rule that decides whether this prototype is reusable. |
| 10 | **PROJECT_TASKS.md** | The build backlog. The agent works from here, one task at a time. |
| 11 | **TESTING_CHECKLIST.md** | Manual verification before a task is marked done. |
| 12 | **DEMO_SCENARIOS.md** | Scripted walkthroughs for showing the prototype to a school. |
| 13 | **CHANGELOG.md** | Progress log, updated after every task. |

---

## Four things to settle before any code is written

These are project-management issues, not coding issues. They cost nothing to fix now.

### 1. This is Phase 0, not Phase 1

Three documents now use "Phase 1" to mean three different things:

| Document | "Phase 1" means | Duration |
|---|---|---|
| Project & Architecture Document | Single-school production deployment | 4–5 months |
| PM Delivery Plan v2.0 | Production build to go-live | 28 weeks |
| Prototype brief | A localStorage prototype with no backend | — |

Someone will eventually say "Phase 1 is done" and three people will understand three different things. **Throughout this documentation set, the prototype is called Phase 0.** The production build described in the PM Delivery Plan remains Phase 1. Please use that naming everywhere, including in conversation.

### 2. The prototype is the cheapest way to de-risk the project — if it is aimed at the right questions

The PM Delivery Plan's top risks are R1 (no confirmed pilot school), R3 (teachers don't adopt) and R4 (fee rules wrong for this school). A clickable prototype attacks all three directly and for a fraction of the cost of building the real thing. That is a genuinely good decision.

But it only pays off if the prototype is **shown to real schools and real teachers**, not just built. A prototype that never leaves the team is an expensive design exercise. See DEMO_SCENARIOS.md.

### 3. Be honest about what a localStorage prototype cannot prove

| The prototype **can** validate | The prototype **cannot** validate |
|---|---|
| Workflows and screen sequence | Speed with 1,200 real students |
| Information architecture and navigation | Offline behaviour and sync conflicts |
| Whether the attendance screen feels fast | Whether WhatsApp messages actually deliver |
| Whether the report card layout is acceptable | Whether fee arithmetic matches the school's real rules |
| Which fields the school actually needs | Data migration from the school's existing records |
| Role boundaries and who sees what | Concurrency, permissions enforcement, security |

Write this distinction into any demo. A school that believes the system is finished will be disappointed twice: once when they learn it is not, and again when the real build takes 28 weeks.

### 4. One rule decides whether this becomes a foundation or a throwaway

All data access must go through a repository layer with **async** function signatures, so that Phase 1 replaces the implementation and not the screens. This is covered in DEVELOPMENT_GUIDELINES.md §2 and it is the single most important rule in this documentation set. A prototype with `localStorage.getItem` calls scattered through its components is a prototype that must be rewritten rather than upgraded.

---

## Stack

Next.js (App Router) · TypeScript (strict) · Tailwind CSS · `localStorage` only.

No backend. No API routes that persist data. No database. No authentication server.
