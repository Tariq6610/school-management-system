# Demo Scenarios

The prototype exists to be shown to real schools. These are the scripts.

## Before any demo

- [ ] Reset demo data so the state is known
- [ ] Pin `today()` to a weekday with seeded attendance
- [ ] Open on the machine you will present from; `localStorage` does not travel
- [ ] Have a second browser window on `/demo/whatsapp` to show messages arriving
- [ ] **Say out loud, at the start: this is a working prototype, not the finished product.** See PROJECT_OVERVIEW.md for what it can and cannot prove.

## D1 — The teacher's morning (5 minutes) — *the most important demo*

Sign in as Teacher → dashboard shows three classes today, none marked → open Grade 8-A → roster loads all present → tap two students to absent, one to late → save → toast confirms → switch to the WhatsApp window and show the absence message that just appeared.

**What you are testing:** whether a teacher watching this says "that's faster than my register" or asks a question that reveals a problem. **Hand them the laptop and let them mark the class themselves.** Their hesitation is the data you came for, not their compliments.

## D2 — Admitting a student (4 minutes)

Sign in as School Admin → Students → Add student → fill the form, pausing at the health section → link an existing parent who already has a child → save → open the class roster and show the new student → show the allergy alert on the roster.

**What you are testing:** whether the fields match what the school actually collects. Expect them to name two fields you do not have and one you do not need.

## D3 — The fee cycle (5 minutes)

Sign in as School Admin → Fees → structures → generate invoices for this month → preview shows count and total → confirm → open one invoice → record a partial payment → show balance and status change → print the receipt → open the defaulter list.

**What you are testing:** fee rules. This is where schools differ most from each other, and where wrong assumptions are most expensive to fix later. Ask directly: sibling discounts, late fee rules, what happens to a student who leaves mid-term.

## D4 — Exam to report card (5 minutes)

Sign in as Teacher → marks entry → enter a few marks using only the keyboard → sign in as Admin → review → publish → open the report card preview → batch print a class.

**What you are testing:** the report card layout, which is the single most format-sensitive artefact in the product. Bring a printout. Ask them to mark it up with a pen.

## D5 — The parent's phone (3 minutes)

Sign in as Parent → dashboard shows two children → switch between them → attendance calendar → homework → fee balance → published results.

**What you are testing:** whether the parent view is simple enough for a parent with limited literacy or an older phone. Show it at 360px, not on a wide screen.

## D6 — The network view (3 minutes) — *multi-campus schools only*

Sign in as Super Admin → network dashboard → campus comparison → sort by attendance → drill into the weakest campus.

**What you are testing:** whether multi-campus intelligence is worth the schema work the PM plan commits to in E23. If a multi-campus school shrugs at this screen, that is important information.

## D7 — The assignment loop (4 minutes)

Teacher creates an assignment → sign in as Student → today's tasks → submit → back to Teacher → grade with feedback → back to Student → see the grade.

**What you are testing:** whether the school's teachers realistically have time to do this. LMS adoption risk is real and is flagged in the PM plan. A teacher saying "when would I do this?" is the answer you need.

---

## Capture feedback properly

After each demo, write down within the hour:

1. Where did they hesitate or click the wrong thing?
2. Which fields did they ask for that we do not have?
3. Which of our fields did they say they never use?
4. What did they assume the system does that it does not?
5. What did they ask about that we have not thought about at all?

Feed everything into CHANGELOG.md under "Feedback" and into the PM plan's backlog. **The prototype is only valuable if this list gets written.** A demo that produces admiration and no notes was a demo where nobody was paying attention.
