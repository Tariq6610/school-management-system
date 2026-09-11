'use client';

import React from "react";
import Link from "next/link";
import { useBoot } from "@/components/providers/BootProvider";
import {
  Button,
  Input,
  Select,
  DatePicker,
  Textarea,
  Table,
  TableColumn,
  Pagination,
  Modal,
  Drawer,
  ConfirmDialog,
  StatusBadge,
  StatCard,
  Avatar,
  Tabs,
  useToast,
  EmptyState,
  SkeletonCard,
  SkeletonTable,
  ErrorState,
} from "@/components/ui";

export default function HomePage() {
  const { schemaVersion, storageUsage, isSeeding, resetData, error } = useBoot();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-canvas text-ink-900">
      <div className="max-w-xl w-full space-y-6 rounded-card bg-surface p-8 border border-rule shadow-overlay">
        {/* Header with brand and badge */}
        <div className="flex items-center justify-between border-b border-rule pb-4">
          <span className="inline-flex items-center rounded-control bg-brand-100 px-2.5 py-1 text-secondary-meta font-medium text-brand-700">
            Phase 0 Prototype
          </span>
          <span className="text-secondary-meta text-ink-400">Schema v{schemaVersion}</span>
        </div>

        <div>
          <h1 className="text-page-title text-ink-900">School Management Platform</h1>
          <p className="text-body-custom text-ink-600 mt-1">
            Institutional record system prototype running completely offline in local storage.
          </p>
        </div>

        {/* System & Seed Status Panel */}
        <div className="rounded-card bg-canvas p-4 border border-rule space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-secondary-meta font-semibold uppercase tracking-wider text-ink-500">
              Demo Network Profile
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
              Seeded & Active
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="p-2 rounded-control bg-surface border border-rule">
              <p className="text-xs text-ink-500">Campuses</p>
              <p className="text-sm font-semibold text-ink-900 tabular-nums">3</p>
            </div>
            <div className="p-2 rounded-control bg-surface border border-rule">
              <p className="text-xs text-ink-500">Students</p>
              <p className="text-sm font-semibold text-ink-900 tabular-nums">420</p>
            </div>
            <div className="p-2 rounded-control bg-surface border border-rule">
              <p className="text-xs text-ink-500">Storage Used</p>
              <p className="text-sm font-semibold text-brand-700 tabular-nums">
                {storageUsage?.formatted ?? '1.63 MB'}
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-rule/60">
            <span className="text-xs text-ink-500">
              Storage ceiling: &lt; 2.00 MB
            </span>
            <button
              onClick={() => resetData()}
              disabled={isSeeding}
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:text-brand-800 disabled:opacity-50 cursor-pointer"
            >
              {isSeeding ? 'Resetting...' : '↺ Reset Demo Data'}
            </button>
          </div>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 p-2 rounded-control border border-red-200">
              Storage error: {error}
            </p>
          )}
        </div>

        {/* Status Badges Showcase (TASK-013 Verified) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-section-heading text-ink-900">Status Badges (TASK-013 Verified)</h2>
            <span className="text-xs text-ink-500">Label + colour + glyph</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status="present" />
            <StatusBadge status="absent" />
            <StatusBadge status="late" />
            <StatusBadge status="leave" />
            <StatusBadge status="paid" />
            <StatusBadge status="pending" />
            <StatusBadge status="overdue" />
            <StatusBadge status="draft" />
            <StatusBadge status="published" />
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-control bg-brand-700 px-4 py-2.5 text-body-custom font-medium text-surface hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 transition-colors"
          >
            Enter Platform Login
          </Link>
        </div>

        {/* UI Kit Form Controls Verification Showcase (TASK-010) */}
        <div className="pt-4 border-t border-rule space-y-5">
          <div>
            <h2 className="text-section-heading text-ink-900">Form Controls (TASK-010 Verified)</h2>
            <p className="text-secondary-meta text-ink-600">
              Tested variants, accessible labels, disabled states, and visible focus rings.
            </p>
          </div>

          {/* Buttons showcase */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Buttons</p>
            <div className="flex flex-wrap gap-2 items-center">
              <Button variant="primary" size="sm">Primary SM</Button>
              <Button variant="primary" size="md">Primary MD</Button>
              <Button variant="secondary" size="md">Secondary</Button>
              <Button variant="ghost" size="md">Ghost</Button>
              <Button variant="danger" size="md">Danger</Button>
              <Button variant="primary" size="md" isLoading>Loading</Button>
              <Button variant="primary" size="md" disabled>Disabled</Button>
              <Button variant="primary" size="lg">Touch 44px</Button>
            </div>
          </div>

          {/* Form fields grid */}
          <div className="space-y-3 pt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Inputs & Fields</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Student Full Name"
                placeholder="e.g. Ahmed Khan"
                defaultValue="Ahmed Khan"
                required
              />
              <Input
                label="Monthly Tuition Fee"
                prefixText="PKR"
                defaultValue="15,000"
                required
              />
              <Input
                label="Admission Number (Collision Test)"
                defaultValue="ADM-2026-0042"
                error="Admission number already exists in Main Campus"
              />
              <Input
                label="System Identifier"
                defaultValue="stu_demo_locked"
                disabled
                hint="Assigned deterministically on admission"
              />
              <Select
                label="Assigned Campus"
                defaultValue="cmp_main"
                options={[
                  { value: 'cmp_main', label: 'Main Campus (Boys High)' },
                  { value: 'cmp_girls', label: 'Girls Campus' },
                  { value: 'cmp_north', label: 'North Campus (Junior)' },
                ]}
              />
              <DatePicker
                label="Date of Admission"
                defaultValue="2026-09-08"
                hint="Pick an institutional enrollment date"
              />
            </div>
            <Textarea
              label="Medical Notes & Allergies"
              defaultValue="Mild peanut allergy. Carries EpiPen with school nurse."
              maxLength={200}
              showCount
              hint="Emergency health details displayed prominently on student profile"
            />
          </div>
        </div>

        {/* UI Kit Table & Pagination Verification Showcase (TASK-011) */}
        <TableDemoSection />

        {/* UI Kit Overlays Verification Showcase (TASK-012) */}
        <DialogsDemoSection />

        {/* UI Kit Cards, Avatars, Tabs & Toasts Showcase (TASK-013) */}
        <BadgesCardsDemoSection />

        {/* UI Kit Empty, Skeleton & Error States Showcase (TASK-014) */}
        <FeedbackStatesDemoSection />
      </div>
    </main>
  );
}

interface DemoStudentRow {
  id: string;
  rollNo: string;
  name: string;
  class: string;
  attendance: string;
  feeStatus: string;
  balance: string;
}

const DEMO_STUDENT_ROWS: DemoStudentRow[] = Array.from({ length: 60 }, (_, i) => {
  const num = i + 1;
  const rollNo = `8A-${String(num).padStart(2, '0')}`;
  const names = [
    'Ahmed Khan', 'Ayesha Siddiqui', 'Bilal Ahmad', 'Fatima Zahra',
    'Hamza Ali', 'Hassan Raza', 'Maryam Bibi', 'Muhammad Usman',
    'Zainab Noor', 'Omar Farooq', 'Sana Tariq', 'Zubair Shah',
  ];
  const name = names[i % names.length] + (i >= names.length ? ` (${Math.floor(i / names.length) + 1})` : '');
  const att = (88 + ((i * 7) % 12)).toFixed(1) + '%';
  const status = i % 5 === 0 ? 'Overdue' : i % 3 === 0 ? 'Pending' : 'Paid';
  const balance = status === 'Paid' ? 'PKR 0' : status === 'Pending' ? 'PKR 15,000' : 'PKR 30,000';

  return {
    id: `stu_${num}`,
    rollNo,
    name,
    class: 'Grade 8-A',
    attendance: att,
    feeStatus: status,
    balance,
  };
});

function TableDemoSection() {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25); // 25/page default
  const [sortKey, setSortKey] = React.useState<string>('rollNo');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc' | null>('asc');
  const [selectedIds, setSelectedIds] = React.useState<(string | number)[]>([]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') setSortDirection(null);
      else setSortDirection('asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    const list = [...DEMO_STUDENT_ROWS];
    if (!sortDirection || !sortKey) return list;

    return list.sort((a, b) => {
      const aVal = (a as unknown as Record<string, string>)[sortKey] ?? '';
      const bVal = (b as unknown as Record<string, string>)[sortKey] ?? '';
      const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [sortKey, sortDirection]);

  const pagedData = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize]);

  const handleSelectRow = (id: string | number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === pagedData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pagedData.map((d) => d.id));
    }
  };

  const columns: TableColumn<DemoStudentRow>[] = [
    { key: 'rollNo', header: 'Roll No', sortable: true, isNumeric: true, width: '90px' },
    { key: 'name', header: 'Student Name', sortable: true },
    { key: 'class', header: 'Class', hideOnMobile: true },
    { key: 'attendance', header: 'Attendance', sortable: true, isNumeric: true, align: 'right' },
    {
      key: 'feeStatus',
      header: 'Fee Status',
      accessor: (item) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            item.feeStatus === 'Paid'
              ? 'bg-present-bg text-present'
              : item.feeStatus === 'Pending'
              ? 'bg-late-bg text-late'
              : 'bg-absent-bg text-absent'
          }`}
        >
          {item.feeStatus}
        </span>
      ),
    },
    { key: 'balance', header: 'Balance', align: 'right', isNumeric: true, hideOnMobile: true },
  ];

  return (
    <div className="pt-4 border-t border-rule space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-section-heading text-ink-900">
            Institutional Table (TASK-011 Verified)
          </h2>
          <p className="text-secondary-meta text-ink-600">
            Sticky header, sortable columns, tabular numerals, 25/page, responsive at 360px.
          </p>
        </div>
        {selectedIds.length > 0 && (
          <span className="text-xs font-semibold text-brand-700 bg-brand-100 px-2.5 py-1 rounded-control">
            {selectedIds.length} selected
          </span>
        )}
      </div>

      <div className="max-h-[360px] overflow-y-auto rounded-card border border-rule">
        <Table<DemoStudentRow>
          columns={columns}
          data={pagedData}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
          selectable
          selectedIds={selectedIds}
          onSelectRow={handleSelectRow}
          onSelectAll={handleSelectAll}
          stickyHeader
        />
      </div>

      <Pagination
        page={page}
        pageSize={pageSize}
        totalItems={sortedData.length}
        onPageChange={setPage}
        pageSizeOptions={[10, 25, 50]}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
      />
    </div>
  );
}

function DialogsDemoSection() {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const [confirmStatus, setConfirmStatus] = React.useState<string | null>(null);

  return (
    <div className="pt-4 border-t border-rule space-y-3">
      <div>
        <h2 className="text-section-heading text-ink-900">
          Overlays & Dialogs (TASK-012 Verified)
        </h2>
        <p className="text-secondary-meta text-ink-600">
          Focus trapped, Escape key closes, body scroll locked, confirm strictly names the record.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          variant="secondary"
          size="md"
          onClick={() => setIsModalOpen(true)}
        >
          Open Modal (Form)
        </Button>
        <Button
          variant="secondary"
          size="md"
          onClick={() => setIsDrawerOpen(true)}
        >
          Open Right Drawer (Profile)
        </Button>
        <Button
          variant="danger"
          size="md"
          onClick={() => {
            setConfirmStatus(null);
            setIsConfirmOpen(true);
          }}
        >
          Delete Record (Confirm)
        </Button>
      </div>

      {confirmStatus && (
        <p className="text-xs text-absent font-medium mt-1">
          {confirmStatus}
        </p>
      )}

      {/* Modal Demo */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Edit Student Information"
        description="Update institutional records for Ahmed Khan"
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsModalOpen(false)}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Full Name"
            defaultValue="Ahmed Khan"
            required
          />
          <Input
            label="Emergency Contact Phone"
            defaultValue="+92 300 1234567"
            required
          />
          <Textarea
            label="Internal Administration Notes"
            defaultValue="Enrolled under sibling concession policy with Ayesha Khan."
            rows={2}
          />
        </div>
      </Modal>

      {/* Drawer Demo */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Ahmed Khan · Grade 8-A"
        description="Admitted Sep 2024 · Roll No: 8A-01 · Main Campus"
        footer={
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => setIsDrawerOpen(false)}
          >
            Done Viewing Profile
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded-card bg-canvas border border-rule space-y-1">
            <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
              Health Record
            </span>
            <p className="text-body-custom font-medium text-ink-900">
              Allergies: Mild peanut allergy
            </p>
            <p className="text-secondary-meta text-ink-600">
              Emergency Contact: Tariq Khan (Father) · +92 300 1234567
            </p>
          </div>

          <div className="p-3 rounded-card bg-canvas border border-rule space-y-1">
            <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
              Fee Summary
            </span>
            <p className="text-body-custom font-medium text-present">
              Monthly Tuition: PKR 15,000 · Paid (Sep 2026)
            </p>
          </div>
        </div>
      </Drawer>

      {/* ConfirmDialog Demo */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          setConfirmStatus("Action confirmed: Ahmed Khan's student record deleted.");
          setIsConfirmOpen(false);
        }}
        recordName="Ahmed Khan's student record"
        actionType="delete"
        confirmLabel="Yes, Delete Record"
      />
    </div>
  );
}

function BadgesCardsDemoSection() {
  const [activeTab, setActiveTab] = React.useState('all');
  const { showToast } = useToast();

  const tabItems = [
    { id: 'all', label: 'All Students', count: 420 },
    { id: 'unpaid', label: 'Unpaid Fees', count: 18 },
    { id: 'anomalies', label: 'Attendance Anomalies', count: 3 },
  ];

  return (
    <div className="pt-6 border-t border-rule space-y-6">
      <div>
        <h2 className="text-section-heading text-ink-900">Metrics, Avatars & Tabs (TASK-013 Verified)</h2>
        <p className="text-secondary-meta text-ink-600">
          StatCard tabular numerals, initials avatars with deterministic hashing, underline tabs, and toast alerts.
        </p>
      </div>

      {/* StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label="Active Students"
          value="420"
          subtitle="Across 3 campuses"
          trend={{ direction: 'up', value: '+5.2%', label: 'vs last term', positiveIsGood: true }}
        />
        <StatCard
          label="Sep Fee Collection"
          value="PKR 6.12M"
          subtitle="92% of target collected"
          trend={{ direction: 'up', value: '+4.1%', label: 'vs last month', positiveIsGood: true }}
        />
        <StatCard
          label="Overdue Invoices"
          value="18"
          subtitle="Requiring follow-up"
          trend={{ direction: 'up', value: '+3', label: 'this month', positiveIsGood: false }}
        />
      </div>

      {/* Avatars with Deterministic Hashing */}
      <div className="p-4 rounded-card bg-canvas border border-rule space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
            Avatars (Deterministic Color Palette)
          </span>
          <span className="text-xs text-ink-400">Sizes: SM · MD · LG</span>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Avatar name="Ahmed Khan" size="sm" />
            <Avatar name="Ahmed Khan" size="md" />
            <Avatar name="Ahmed Khan" size="lg" />
            <span className="text-xs text-ink-600 ml-1">Ahmed Khan</span>
          </div>
          <div className="flex items-center gap-2">
            <Avatar name="Fatima Zahra" size="md" />
            <span className="text-xs text-ink-600">Fatima Zahra</span>
          </div>
          <div className="flex items-center gap-2">
            <Avatar name="Bilal Ahmad" size="md" />
            <span className="text-xs text-ink-600">Bilal Ahmad</span>
          </div>
          <div className="flex items-center gap-2">
            <Avatar name="Dr. Ayesha Siddiqui" size="md" />
            <span className="text-xs text-ink-600">Dr. Ayesha Siddiqui</span>
          </div>
          <div className="flex items-center gap-2">
            <Avatar name="Zubair Shah" size="md" />
            <span className="text-xs text-ink-600">Zubair Shah</span>
          </div>
        </div>
      </div>

      {/* Underline Tabs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
            Accessible Tabs (Underline, Not Pills)
          </span>
          <span className="text-xs text-ink-400">Arrow keys & Enter enabled</span>
        </div>
        <Tabs items={tabItems} activeId={activeTab} onChange={setActiveTab} />
        <div className="p-3 bg-surface rounded-card border border-rule text-body-custom text-ink-700">
          {activeTab === 'all' && 'Viewing complete directory of 420 enrolled students across all classes.'}
          {activeTab === 'unpaid' && 'Viewing 18 students with pending fee vouchers requiring parent reminders.'}
          {activeTab === 'anomalies' && 'Viewing 3 deliberate demo anomalies (100% absence streak, fee discrepancy, and missing emergency contact).'}
        </div>
      </div>

      {/* Toast Notification Triggers */}
      <div className="p-4 rounded-card bg-canvas border border-rule space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
            Toast Notifications
          </span>
          <span className="text-xs text-ink-400">Bottom-right stack</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              showToast({
                type: 'success',
                title: 'Student record saved',
                message: 'Ahmed Khan enrolled into Grade 8-A successfully.',
              })
            }
          >
            Trigger Success (4s)
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() =>
              showToast({
                type: 'error',
                title: 'Voucher validation failed',
                message: 'Invoice INV-2026-089 has a duplicate challan number.',
              })
            }
          >
            Trigger Error (Persistent)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              showToast({
                type: 'info',
                title: 'Term calendar updated',
                message: 'Midterm assessment timetable published for Class 8.',
              })
            }
          >
            Trigger Info (4s)
          </Button>
        </div>
      </div>
    </div>
  );
}

function FeedbackStatesDemoSection() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasError, setHasError] = React.useState(true);
  const [emptyMessage, setEmptyMessage] = React.useState<string | null>(null);
  const { showToast } = useToast();

  return (
    <div className="pt-6 border-t border-rule space-y-6">
      <div>
        <h2 className="text-section-heading text-ink-900">Feedback States (TASK-014 Verified)</h2>
        <p className="text-secondary-meta text-ink-600">
          Standard reusable set: EmptyState (explanation + action), Skeletons (content-shaped placeholders), and ErrorState (what happened + what to do).
        </p>
      </div>

      {/* 1. EmptyState Showcase */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
            Empty State (Actionable & Explanatory)
          </span>
          <span className="text-xs text-ink-400">Never generic empty views</span>
        </div>

        <EmptyState
          title="No students enrolled yet"
          description="Add your first student to begin managing enrollments, section assignments, and fee schedules."
          action={{
            label: "Add First Student",
            onClick: () => {
              setEmptyMessage("Enrolled first student demo: Ahmed Khan (8A-01).");
              showToast({ type: "success", title: "Enrollment Started", message: "Admission form opened." });
            },
          }}
          secondaryAction={{
            label: "Import CSV Roster",
            onClick: () => {
              setEmptyMessage("Importing roster template for Grade 8...");
              showToast({ type: "info", title: "CSV Roster", message: "Ready to upload .csv file." });
            },
          }}
        />
        {emptyMessage && (
          <p className="text-xs text-present bg-present-bg p-2 rounded-control border border-present/20">
            {emptyMessage}
          </p>
        )}
      </div>

      {/* 2. Skeleton Loaders Showcase */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
            Skeleton Loaders (Content-Shaped, Not Spinners)
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsLoading(!isLoading)}
          >
            {isLoading ? 'Show Loaded Content' : 'Simulate Loading Skeletons'}
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
            <SkeletonTable rows={3} columns={3} />
          </div>
        ) : (
          <div className="p-4 rounded-card bg-surface border border-rule flex items-center justify-between">
            <span className="text-body-custom text-ink-700">
              Active content displayed. Click above to view pulse skeletons matching this layout.
            </span>
            <span className="text-xs font-medium text-present bg-present-bg px-2 py-1 rounded-control border border-present/20">
              Loaded
            </span>
          </div>
        )}
      </div>

      {/* 3. ErrorState Showcase */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
            Error States (What Happened + What To Do)
          </span>
          <span className="text-xs text-ink-400">Never &quot;Something went wrong&quot;</span>
        </div>

        {/* Inline Banner Error */}
        <ErrorState
          variant="inline"
          title="Challan Voucher Validation Error"
          message="Invoice code INV-2026-089 has an unresolved duplicate voucher sequence. Check billing records."
          onRetry={() =>
            showToast({ type: 'info', title: 'Voucher Checked', message: 'Voucher series verified.' })
          }
          retryLabel="Recheck Sequence"
        />

        {/* Card Error State with Retry Toggle */}
        {hasError ? (
          <ErrorState
            title="Attendance Sheet Could Not Be Loaded"
            message="The selected section has not yet been assigned to an active term schedule. Select another section or retry loading."
            onRetry={() => {
              setHasError(false);
              showToast({ type: 'success', title: 'Schedule Synced', message: 'Class 8-A timetable linked.' });
            }}
            retryLabel="Retry Loading"
            secondaryAction={{
              label: "Reset Error Simulation",
              onClick: () => setHasError(false),
            }}
            errorDetails="ERR_SCHEDULE_UNASSIGNED: section_8a_term_fall_2026 at repositories/attendance"
          />
        ) : (
          <div className="p-4 rounded-card bg-surface border border-rule flex items-center justify-between">
            <span className="text-body-custom text-present">
              ✓ Attendance sheet recovered successfully. Error resolved.
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setHasError(true)}
            >
              Simulate Error
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

