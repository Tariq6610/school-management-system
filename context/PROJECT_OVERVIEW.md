# Project Overview

## What this is

A **clickable prototype** of the School Management Platform: a school ERP, an LMS, a teacher experience and a parent experience, all running in the browser with no backend.

Its job is to answer product questions before anyone writes production code — which screens are needed, in what order, with which fields, and whether the people who will use it every day find it usable.

## Naming

This work is **Phase 0**. It sits before Gate 0 in the PM Delivery Plan.

```
Phase 0            Gate 0          Phase 1              Phase 1.5      Gate 2
Prototype   ──>   Decisions  ──>  Production build ──>  LMS       ──>  Growth
(this doc)        signed off      (28 weeks)                           decision
```

Phase 0 feeds Gate 0. Demonstrating the prototype is how you convert an interested school into a confirmed pilot school, which is decision **D1** — the decision the entire project depends on.

## Goals, in priority order

1. **Win a confirmed pilot school.** A school that has clicked through a realistic system commits far more readily than one shown a slide deck.
2. **Validate the daily workflows** with real teachers and real administrators — above all, attendance marking and fee recording.
3. **Discover the fields and rules we got wrong** while changing them still costs an hour instead of a sprint.
4. **Settle the report card format**, which is the single most format-sensitive artefact in the product.
5. **Produce a reference implementation of the UI** that Phase 1 can build against instead of designing from scratch.

## What the prototype must *not* be used for

- **Do not promise it as the product.** It has no security, no data integrity, and no persistence beyond one browser on one device. Clearing browser data deletes everything.
- **Do not let it become the production codebase by accident.** It may become the production *frontend*, which is a deliberate and different decision — and only if DEVELOPMENT_GUIDELINES.md §2 has been followed throughout.
- **Do not size Phase 1 from it.** The prototype skips the majority of Phase 1's real work: authentication, permissions enforcement, data migration, backups, WhatsApp integration, reporting, and everything in the PM plan's epics E15 through E18.

## Honest limitations

| Limitation | Consequence for a demo |
|---|---|
| `localStorage` is per-browser, per-device | The school cannot "try it at home". Demos happen on your machine. |
| Storage caps at roughly 5MB | Full-year attendance for a whole school does not fit. See DATA_MODELS.md §6 for the compaction strategy. |
| No authentication | Role switching is a demo convenience. Anyone can be anyone. Never show this to a school as a security model. |
| No concurrency | Two people cannot use it at once. |
| Uploaded files are not real | File uploads store a filename and a placeholder, not the file. |
| WhatsApp is a mock screen | It proves the message copy and the trigger, not delivery. |

Say all of this out loud during a demo. A school that understands it is looking at a prototype gives you useful feedback. A school that thinks it is looking at a finished product gives you a purchase decision it will later regret.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js, App Router |
| Language | TypeScript, strict mode |
| Styling | Tailwind CSS |
| State | React state and context; no external state library |
| Persistence | `localStorage`, accessed only through `lib/repositories/` |
| Charts | Recharts, only where a chart genuinely reads better than a table |
| Icons | One icon set, used consistently |

## Scope summary

**In scope:** all six roles, authentication UI, super-admin portal, school-admin portal, campus management, students, teachers, classes, subjects, timetable, attendance, fees, exams and results, LMS (courses, lessons, assignments), parent experience, student experience, announcements, messaging, and the five differentiation screens.

**Out of scope:** real authentication, real file storage, real notifications, offline support, printing beyond browser print, data import from external files, and anything requiring a server.

## Relationship to the other documents

| Document | What it governs | Where it wins |
|---|---|---|
| Project & Architecture Document | Production data model and architecture rules | Field names and entity relationships |
| PM Delivery Plan v2.0 | Delivery sequence, risks, scope decisions | Whether something is in Phase 0 at all |
| Differentiation & Value Features | Product positioning | Which differentiators get a prototype screen |
| **This documentation set** | The prototype | Everything about how the prototype behaves |

Where the prototype's data model differs from the architecture document, the architecture document's field names win — the prototype should use the same names so Phase 1 inherits them. Where the prototype needs something the architecture document does not have, add it here and flag it in CHANGELOG.md so it can be folded back in.
