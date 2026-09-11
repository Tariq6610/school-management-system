# Component Structure

Check this file before creating any component. If something close already exists, extend it rather than adding a near-duplicate.

```
/components
  /ui
    Button.tsx            primary | secondary | ghost | danger
    Input.tsx             + Textarea, Select, DatePicker, Checkbox, RadioGroup
    SegmentedControl.tsx  used by the attendance status control
    Table.tsx             + TableHeader, TableRow, TableCell, SortableHeader
    Pagination.tsx
    Modal.tsx             + Drawer, ConfirmDialog
    Tabs.tsx
    StatusBadge.tsx       present|absent|late|leave|paid|pending|overdue|draft|published
    StatCard.tsx
    Avatar.tsx
    Toast.tsx             + ToastProvider
    EmptyState.tsx
    Skeleton.tsx          + TableSkeleton, CardSkeleton
    ErrorState.tsx
    SearchInput.tsx
    FileDropzone.tsx      captures a filename only — stores no file

  /layout
    AppShell.tsx          sidebar + top bar + content
    Sidebar.tsx           role-scoped navigation
    BottomNav.tsx         under 768px, max 5 items
    TopBar.tsx
    CampusSwitcher.tsx
    ChildSwitcher.tsx     parent role only
    AcademicYearSwitcher.tsx
    UserMenu.tsx
    PageHeader.tsx        title + breadcrumb + primary action
    DemoBanner.tsx        persistent "prototype" indicator

  /students
    StudentTable.tsx
    StudentFilters.tsx
    StudentForm.tsx       + PersonalSection, AcademicSection, ParentSection,
                            HealthSection, DocumentsSection
    StudentProfileHeader.tsx
    StudentTabs.tsx
    HealthAlertBanner.tsx allergies and conditions, shown at the top of rosters
    PickupPersonList.tsx

  /teachers
    TeacherTable.tsx  TeacherForm.tsx  TeacherProfile.tsx  AssignmentPicker.tsx

  /classes
    ClassTable.tsx  ClassForm.tsx  ClassRoster.tsx  SubjectList.tsx

  /attendance
    AttendanceGrid.tsx          the marking screen — see UI_DESIGN_SYSTEM.md §7
    AttendanceStatusControl.tsx segmented, 44px, keyboard-driven
    AttendanceSummaryBar.tsx    live counts
    AttendanceSaveBar.tsx       sticky
    AttendanceCalendar.tsx      parent monthly view
    AttendanceOverviewGrid.tsx  admin classes × dates
    QRScannerMock.tsx

  /fees
    FeeStructureForm.tsx  InvoiceTable.tsx  InvoiceGenerator.tsx
    PaymentForm.tsx  Receipt.tsx  FeeLedger.tsx  DefaulterTable.tsx

  /exams
    ExamForm.tsx  MarksEntryGrid.tsx  ResultsTable.tsx
    ReportCard.tsx  ReportCardBatch.tsx  PublishControl.tsx

  /timetable
    TimetableGrid.tsx  SlotPicker.tsx  ClashWarning.tsx  TimetablePrintView.tsx

  /lms
    CourseCard.tsx  CourseForm.tsx  LessonList.tsx  LessonEditor.tsx
    LessonViewer.tsx  ProgressBar.tsx  TodaysTasks.tsx
    AssignmentForm.tsx  SubmissionList.tsx  GradingPanel.tsx

  /communication
    AnnouncementComposer.tsx  AnnouncementFeed.tsx
    MessageThread.tsx  MessageList.tsx  NotificationCentre.tsx
    WhatsAppMock.tsx          phone-shaped conversation view
    WhatsAppLogPanel.tsx      sent-message list beside it

  /dashboards
    AdminDashboard.tsx  PrincipalDashboard.tsx  TeacherDashboard.tsx
    ParentDashboard.tsx  StudentDashboard.tsx  SuperAdminDashboard.tsx
    CampusComparison.tsx
    LearningProfile.tsx        + ProposedNoteCard (confirm | edit | dismiss)
    EngagementOutreachList.tsx admin-facing prompts, no scores

  /charts
    TrendLine.tsx  ComparisonBar.tsx  DonutStat.tsx
```

## Contracts

**Every table component** takes `{ data, isLoading, error, onRowClick? }` and renders its own loading, empty and error states internally. Pages should never hand-roll those three states.

**Every form component** takes `{ initialValues?, onSubmit, onCancel, isSubmitting }` and owns its validation. Pages own the repository call.

**Every list page** follows the same shape: `PageHeader` → filters → table → pagination. Consistency here is worth more than per-screen cleverness, because an administrator learns one pattern and reuses it across fifteen screens.

**Components never call repositories directly.** Pages fetch and pass data down. This keeps components trivially reusable and makes the Phase 1 API swap touch only pages.

## Naming

- Domain folders are plural: `/students`, not `/student`.
- A component that renders a list is `XTable` or `XList`; a component that renders one record is `XProfile` or `XCard`.
- Mock or demo-only components carry `Mock` or `Demo` in the name so they are trivially findable when the prototype is stripped for Phase 1.
