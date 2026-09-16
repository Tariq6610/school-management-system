import React from 'react';
import { ParentChildHomeworkPillar } from '@/lib/repositories/parentDashboard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table } from '@/components/ui/Table';

interface ParentHomeworkViewProps {
  homework: ParentChildHomeworkPillar | null;
}

export function ParentHomeworkView({ homework }: ParentHomeworkViewProps) {
  if (!homework || homework.items.length === 0) {
    return (
      <EmptyState
        title="No Pending Homework"
        description="Your child has no pending homework assignments at this time. All coursework is up to date!"
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
            {homework.totalPendingCount} assignment{homework.totalPendingCount !== 1 ? 's' : ''} require your child&apos;s attention.
          </p>
        </div>

        <div className="overflow-x-auto">
          <Table
            data={homework.items}
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
                  </div>
                ),
              },
              {
                key: 'deadline',
                header: 'Due Date',
                accessor: (item) => (
                  <span className="font-mono text-sm">{item.deadline}</span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                accessor: (item) => {
                  if (item.isOverdue) {
                    return (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Overdue ({Math.abs(item.daysRemaining)} days)
                      </span>
                    );
                  }
                  if (item.daysRemaining <= 2) {
                    return (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Due Soon ({item.daysRemaining} days)
                      </span>
                    );
                  }
                  return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      On Track ({item.daysRemaining} days left)
                    </span>
                  );
                },
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
