'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LeaveRequestStatus } from '@/types';
import {
  approveLeaveRequest,
  EnrichedLeaveRequest,
  listEnrichedLeaveRequests,
  rejectLeaveRequest,
} from '@/lib/repositories/leaveRequests';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonCard } from '@/components/ui/Skeleton';

const LEAVE_TYPE_LABELS: Record<string, string> = {
  sick: 'Sick Leave',
  casual: 'Casual Leave',
  annual: 'Annual Leave',
  other: 'Other',
};

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  if (startDate === endDate) return start;
  const end = new Date(endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${start} – ${end}`;
}

type FilterTab = 'all' | LeaveRequestStatus;

export function LeaveRequestsView() {
  const { session, activeCampusId } = useSession();
  const { showToast } = useToast();

  const schoolId = session?.schoolId ?? 'sch_main';
  const campusId = activeCampusId || session?.campusId || 'cmp_main';

  const [requests, setRequests] = useState<EnrichedLeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('pending');
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<EnrichedLeaveRequest | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await listEnrichedLeaveRequests({ schoolId, campusId });
      setRequests(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load staff leave requests.');
    } finally {
      setIsLoading(false);
    }
  }, [schoolId, campusId]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) load();
    });
    return () => {
      ignore = true;
    };
  }, [load]);

  const stats = useMemo(() => {
    return {
      pending: requests.filter((r) => r.status === 'pending').length,
      approved: requests.filter((r) => r.status === 'approved').length,
      rejected: requests.filter((r) => r.status === 'rejected').length,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    if (activeTab === 'all') return requests;
    return requests.filter((r) => r.status === activeTab);
  }, [requests, activeTab]);

  const handleApprove = async (request: EnrichedLeaveRequest) => {
    if (!session?.userId) return;
    setDecidingId(request.id);
    try {
      await approveLeaveRequest(request.id, session.userId);
      showToast({
        type: 'success',
        title: 'Leave request approved',
        message: `${request.teacherName}'s ${LEAVE_TYPE_LABELS[request.leaveType]} request has been approved.`,
      });
      await load();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Could not approve request',
        message: err instanceof Error ? err.message : 'An unexpected error occurred.',
      });
    } finally {
      setDecidingId(null);
    }
  };

  const openRejectModal = (request: EnrichedLeaveRequest) => {
    setRejectTarget(request);
    setRejectNote('');
  };

  const handleReject = async () => {
    if (!rejectTarget || !session?.userId) return;
    setDecidingId(rejectTarget.id);
    try {
      await rejectLeaveRequest(rejectTarget.id, session.userId, rejectNote);
      showToast({
        type: 'info',
        title: 'Leave request rejected',
        message: `${rejectTarget.teacherName}'s request has been rejected.`,
      });
      setRejectTarget(null);
      await load();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Could not reject request',
        message: err instanceof Error ? err.message : 'An unexpected error occurred.',
      });
    } finally {
      setDecidingId(null);
    }
  };

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'pending', label: 'Pending', count: stats.pending },
    { id: 'approved', label: 'Approved', count: stats.approved },
    { id: 'rejected', label: 'Rejected', count: stats.rejected },
    { id: 'all', label: 'All', count: requests.length },
  ];

  if (loadError) {
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <ErrorState
          title="Staff Leave Requests Could Not Be Loaded"
          message={loadError}
          onRetry={load}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-page-title text-ink-900">Staff Leave Requests</h1>
        <p className="text-secondary-meta text-ink-600 mt-1">
          Approve or reject leave requests submitted by teachers on your campus.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Pending Review" value={String(stats.pending)} subtitle="Awaiting your decision" />
        <StatCard label="Approved" value={String(stats.approved)} subtitle="This term" />
        <StatCard label="Rejected" value={String(stats.rejected)} subtitle="This term" />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-rule overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-ink-500 hover:text-ink-900'
            }`}
          >
            {tab.label} <span className="text-ink-400">({tab.count})</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filteredRequests.length === 0 ? (
        <EmptyState
          title="No leave requests here"
          description={
            activeTab === 'pending'
              ? 'There are no pending leave requests awaiting your review.'
              : 'No leave requests match this filter yet.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => (
            <div key={request.id} className="rounded-card bg-surface border border-rule p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-body-custom font-semibold text-ink-900">{request.teacherName}</h3>
                  <p className="text-secondary-meta text-ink-500">
                    {request.teacherEmployeeNumber ? `${request.teacherEmployeeNumber} · ` : ''}
                    {LEAVE_TYPE_LABELS[request.leaveType] ?? request.leaveType}
                  </p>
                </div>
                <StatusBadge
                  status={request.status === 'approved' ? 'active' : request.status === 'rejected' ? 'failed' : 'pending'}
                  label={request.status === 'approved' ? 'Approved' : request.status === 'rejected' ? 'Rejected' : 'Pending'}
                />
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-1 text-secondary-meta text-ink-600">
                <span>
                  <strong className="text-ink-900 font-medium">{formatDateRange(request.startDate, request.endDate)}</strong>{' '}
                  ({request.dayCount} day{request.dayCount > 1 ? 's' : ''})
                </span>
              </div>

              <p className="text-body-custom text-ink-700">{request.reason}</p>

              {request.status !== 'pending' && request.decidedByName && (
                <p className="text-secondary-meta text-ink-500 border-t border-rule pt-2">
                  Decided by <span className="font-medium text-ink-700">{request.decidedByName}</span>
                  {request.decisionNote ? `: "${request.decisionNote}"` : ''}
                </p>
              )}

              {request.status === 'pending' && (
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={decidingId === request.id}
                    onClick={() => handleApprove(request)}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={decidingId === request.id}
                    onClick={() => openRejectModal(request)}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject Leave Request"
        description={rejectTarget ? `${rejectTarget.teacherName}'s ${LEAVE_TYPE_LABELS[rejectTarget.leaveType]} request` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              isLoading={!!decidingId}
              onClick={handleReject}
            >
              Confirm Rejection
            </Button>
          </>
        }
      >
        <Textarea
          label="Reason for rejection (optional)"
          value={rejectNote}
          onChange={(e) => setRejectNote(e.target.value)}
          placeholder="e.g. Cannot approve during exam week, please resubmit for a later date."
          rows={3}
        />
      </Modal>
    </div>
  );
}
