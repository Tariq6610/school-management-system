# UI Design System

## 1. Design brief

**Who uses this:** an office administrator entering fees between parent visits; a teacher marking attendance in the first ninety seconds of a lesson; a parent checking a phone on the way to work. Not people browsing — people finishing tasks.

**Therefore:** density over whitespace, legibility over elegance, unmistakable status, and speed on the two screens used every single day (attendance marking and fee entry). Everything else stays quiet.

**Spend the boldness in one place.** The attendance screen is the signature moment: large tap targets, all-present by default, one tap to change a student, a sticky save bar. Every other screen is deliberately plain so that one feels fast.

## 2. Colour

Primary purple and secondary blue are set by the brief. The specific values below are chosen for contrast and for the fact that this is an institutional record system, not a consumer app.

```css
--brand-700: #4B2FA8;   /* primary, deep iris — headers, primary buttons */
--brand-600: #5B41C7;   /* primary hover / active nav */
--brand-100: #EDE9FB;   /* selected rows, subtle brand tint */

--accent-700: #1D5F96;  /* secondary blue — links, secondary actions */
--accent-100: #E4EEF7;

--ink-900:   #1A1B23;   /* body text */
--ink-600:   #565A68;   /* secondary text */
--ink-400:   #8B90A0;   /* placeholder, disabled */
--rule:      #E2E4EA;   /* borders, dividers */
--surface:   #FFFFFF;   /* cards, tables */
--canvas:    #F6F6F9;   /* page background */
--sidebar:   #241C46;   /* deep aubergine — navigation only */
```

**Status colours.** These carry operational meaning and must never be substituted or reused decoratively.

```css
--present: #17795E;   --present-bg: #E3F3EE;   /* present, paid, submitted */
--absent:  #B4322A;   --absent-bg:  #FBE9E7;   /* absent, overdue, failed */
--late:    #9A6206;   --late-bg:    #FDF1DC;   /* late, partial, pending */
--leave:   #4A5265;   --leave-bg:   #EDEFF3;   /* leave, excused, draft */
```

**Rule: colour never carries meaning alone.** Every status shows a label, and in dense tables a short glyph as well. A colour-blind administrator must be able to read the fee list.

## 3. Typography

**One family: Noto Sans.** Chosen deliberately — it covers Latin cleanly at small sizes and has a matching Urdu family (Noto Nastaliq Urdu) if this platform is ever localised, which for a Pakistani school system is a realistic near-term requirement. Weight, not a second typeface, carries hierarchy.

```css
--font: 'Noto Sans', system-ui, sans-serif;
```

| Role | Size / line-height | Weight |
|---|---|---|
| Page title | 24 / 32 | 600 |
| Section heading | 18 / 26 | 600 |
| Card title | 15 / 22 | 600 |
| Body | 14 / 21 | 400 |
| Table cell | 13.5 / 20 | 400 |
| Secondary / meta | 12.5 / 18 | 400 |
| Stat number | 30 / 34 | 600, tabular |

**Numerals must be tabular everywhere they appear in a column** — marks, fees, percentages, counts. Add `font-variant-numeric: tabular-nums` to every table cell and stat. Misaligned digits in a fee ledger make an accurate system look untrustworthy.

Sentence case for everything. No all-caps labels. Line length under 80 characters in prose areas.

## 4. Layout

```
┌──────────┬──────────────────────────────────────────────┐
│          │  Campus ▾   Academic year ▾        User ▾    │  56px top bar
│  Sidebar ├──────────────────────────────────────────────┤
│  240px   │  Page title                     [Primary CTA]│
│  fixed   │  ──────────────────────────────────────────  │
│          │                                              │
│  role-   │  Content                                     │
│  scoped  │  · tables run full width                     │
│  nav     │  · forms cap at 640px                        │
│          │  · detail pages: 2/3 + 1/3 split             │
└──────────┴──────────────────────────────────────────────┘
```

**Campus switcher lives in the top bar, always visible.** For a multi-campus school this is the most important control in the product — a principal must never be uncertain which campus's data they are looking at. When a campus is selected, its name appears in the top bar and the page title. Single-campus schools never see the control.

Below 768px the sidebar collapses to a bottom navigation bar of at most five items. Teacher and parent views are designed mobile-first, since that is where they will actually be used.

Spacing scale: `4 · 8 · 12 · 16 · 24 · 32 · 48`. Nothing else.
Radius: `6px` for controls, `10px` for cards. Two values, no more.
Elevation: one shadow, used only for overlays — `0 4px 16px rgba(26,27,35,.12)`. Cards use a border, not a shadow.

## 5. Components

| Component | Variants | Notes |
|---|---|---|
| Button | primary, secondary, ghost, danger | 36px default, 44px on touch views |
| Input, Select, DatePicker | default, error, disabled | Label always visible, never placeholder-as-label |
| Table | default, compact, selectable | Sticky header; sortable columns; row hover |
| StatCard | default, trend | Number, label, optional change indicator |
| StatusBadge | present, absent, late, leave, paid, pending, overdue, draft, published | Text plus colour, never colour alone |
| Modal | sm, md, lg | Focus trapped; Escape closes; confirm on destructive |
| Drawer | right | Detail views without losing the list |
| Tabs | — | Underline, not pills |
| EmptyState | — | Icon, one line of explanation, one action |
| Toast | success, error, info | Bottom-right; auto-dismiss except errors |
| Avatar | sm, md, lg | Initials fallback with a deterministic colour |
| SearchInput | — | Debounced 200ms, clearable |
| Pagination | — | Page size 25 default |
| ConfirmDialog | — | Names the record being affected |

## 6. Interaction rules

- **Loading:** skeletons that match the shape of the content, not spinners. Never a blank screen.
- **Empty:** explain what would appear here and offer the action that creates it. "No students yet — add your first student."
- **Errors:** say what happened and what to do. Never "Something went wrong."
- **Destructive actions:** confirm, and name the record. "Delete Ahmed Khan's record?"
- **Saving:** disable the button, show progress, then a toast. The button that says "Save student" produces "Student saved."
- **Forms:** validate on blur, not on every keystroke. Summarise errors at the top on submit and focus the first invalid field.
- **Tables:** sticky headers, no horizontal scroll under 1200px for the primary columns, and row density that fits ~15 rows on a laptop screen without scrolling.

## 7. The attendance screen

The one screen that gets extra design attention, because it is used by every teacher every morning and it is where adoption is won or lost.

```
┌────────────────────────────────────────────────────┐
│ Grade 8-A · Mathematics · Mon 7 Sep      Period 1  │
│ 38 present · 2 absent · 0 late                     │
├────────────────────────────────────────────────────┤
│  1  Ahmed Khan            [Present] Absent Late Lv │
│  2  Ayesha Siddiqui       [Present] Absent Late Lv │
│  3  Bilal Ahmad            Present [Absent] Late Lv│
├────────────────────────────────────────────────────┤
│                    [ Save attendance ]  ← sticky   │
└────────────────────────────────────────────────────┘
```

Requirements:
- Everyone defaults to **present**. The teacher only changes the exceptions.
- Status is a segmented control, 44px tall, reachable with one thumb.
- The running count updates live at the top.
- The save bar is sticky and always visible, never below the fold.
- A 40-student class must be markable in **under 60 seconds** including the save.
- Fully keyboard-operable on desktop: arrow keys move between students, `P` `A` `L` `V` set status.
- Already-saved days load with their saved values and show who marked them and when.

## 8. What to avoid

- Gradient washes, decorative illustrations, and hero imagery. This is a work tool.
- Identical rounded cards for content that is not equivalent.
- All-caps eyebrow labels above every heading.
- Animation on page sections. Motion only where it shows what changed — a drawer opening, a row saving.
- More than one accent colour beyond the tokens above.
- Icon-only buttons for anything destructive or ambiguous.
