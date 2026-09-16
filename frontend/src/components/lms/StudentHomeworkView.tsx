import React, { useState } from 'react';
import { Assignment, StudentSubjectTasks } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table } from '@/components/ui/Table';
import { StudentAssignmentModal } from './StudentAssignmentModal';
import Link from 'next/link';

interface StudentHomeworkViewProps {
  subjectGroups: StudentSubjectTasks[];
  studentId: string;
  onRefresh: () => void;
}

export function StudentHomeworkView({ subjectGroups, studentId, onRefresh }: StudentHomeworkViewProps) {
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Flatten all pending assignments from all subject groups
  const allPendingAssignments = subjectGroups.flatMap((group) =>
    group.pendingAssignments.map((assignment) => ({
      ...assignment,
      subjectName: group.subjectName,
      courseTitle: group.courseTitle,
      courseId: group.courseId,
    }))
  );

  // Sort by deadline (soonest first)
  allPendingAssignments.sort((a, b) => {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  if (allPendingAssignments.length === 0) {
    return (
      <EmptyState
        title="No Pending Tasks"
        description="You have no pending assignments or tests at this time. All coursework is up to date!"
        icon={
          <svg className="w-12 h-12 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
          </svg>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-card shadow-xs border border-rule overflow-hidden">
        <div className="p-5 border-b border-rule bg-surface">
          <h2 className="text-lg font-bold text-ink-900">Pending Assignments & Tests</h2>
          <p className="text-sm text-secondary-meta mt-1">
            {allPendingAssignments.length} assignment{allPendingAssignments.length !== 1 ? 's' : ''} require your attention.
          </p>
        </div>

        <div className="overflow-x-auto">
          <Table
            data={allPendingAssignments}
            keyExtractor={(item) => item.id}
            columns={[
              {
                key: 'subject',
                header: 'Subject & Course',
                accessor: (item) => (
                  <div>
                    <div className="font-semibold text-ink-900">{item.subjectName}</div>
                    <div className="text-xs text-secondary-meta">{item.courseTitle}</div>
                  </div>
                ),
              },
              {
                key: 'title',
                header: 'Task',
                accessor: (item) => (
                  <div>
                    <span className="font-medium text-ink-900">{item.title}</span>
                    {item.assignmentType === 'test' && (
                      <span className="ml-2 inline-flex items-center rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/10 uppercase tracking-wide">
                        Test
                      </span>
                    )}
                    {item.assignmentType === 'quiz' && (
                      <span className="ml-2 inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/10 uppercase tracking-wide">
                        Quiz
                      </span>
                    )}
                    {item.assignmentType === 'activity' && (
                      <span className="ml-2 inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/10 uppercase tracking-wide">
                        Activity
                      </span>
                    )}
                  </div>
                ),
              },
              {
                key: 'marks',
                header: 'Max Marks',
                accessor: (item) => (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 text-xs font-mono font-bold">
                    {item.maxMarks}
                  </span>
                ),
              },
              {
                key: 'deadline',
                header: 'Due Date',
                accessor: (item) => (
                  <span className="font-mono text-sm">{item.deadline ? new Date(item.deadline).toLocaleDateString() : 'N/A'}</span>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                accessor: (item) => (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAssignment(item);
                        setIsModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary-900 bg-primary-100 hover:bg-primary-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <span>{item.submissionType === 'offline' ? 'View' : 'Submit'}</span>
                      <span>&rarr;</span>
                    </button>
                    <Link
                      href={`/student/courses/${item.courseId}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors"
                    >
                      Course
                    </Link>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>

      <StudentAssignmentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAssignment(null);
        }}
        assignment={selectedAssignment}
        studentId={studentId}
        onSubmitted={() => {
          setIsModalOpen(false);
          onRefresh();
        }}
      />
    </div>
  );
}
