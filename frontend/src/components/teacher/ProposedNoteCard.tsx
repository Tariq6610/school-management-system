'use client';

import React, { useState } from 'react';
import { ID } from '@/types';
import { LearningProfileProposal } from '@/lib/repositories/learningProfiles';
import { Button } from '@/components/ui/Button';
import { NavIcon } from '@/components/shell/NavIcon';

export interface ProposedNoteCardProps {
  proposal: LearningProfileProposal;
  isTeacherView?: boolean;
  onConfirm?: (proposalId: ID, editedText?: string) => Promise<void>;
  onDismiss?: (proposalId: ID) => Promise<void>;
  isProcessing?: boolean;
}

export function ProposedNoteCard({
  proposal,
  isTeacherView = true,
  onConfirm,
  onDismiss,
  isProcessing = false,
}: ProposedNoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(proposal.editedText || proposal.proposedText);
  const [actionBusy, setActionBusy] = useState(false);

  const isStrength = proposal.category === 'strength';
  const isConfirmed = proposal.status === 'confirmed';
  const isPending = proposal.status === 'pending';

  const handleConfirm = async () => {
    if (!onConfirm) return;
    setActionBusy(true);
    try {
      await onConfirm(proposal.id, isEditing ? editText : undefined);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to confirm proposal:', err);
    } finally {
      setActionBusy(false);
    }
  };

  const handleDismiss = async () => {
    if (!onDismiss) return;
    setActionBusy(true);
    try {
      await onDismiss(proposal.id);
    } catch (err) {
      console.error('Failed to dismiss proposal:', err);
    } finally {
      setActionBusy(false);
    }
  };

  const displayText = proposal.editedText || proposal.proposedText;

  return (
    <div
      className={`rounded-2xl border transition-all ${
        isConfirmed
          ? 'bg-emerald-50/30 border-emerald-200/80 shadow-xs'
          : isStrength
          ? 'bg-white border-neutral-200/80 shadow-xs hover:border-purple-300'
          : 'bg-white border-neutral-200/80 shadow-xs hover:border-amber-300'
      } p-5 space-y-3.5`}
    >
      {/* Card Header & Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Category Badge */}
          <span
            className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              isStrength
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}
          >
            {isStrength ? (
              <>
                <NavIcon name="award" className="w-3.5 h-3.5" /> Strength
              </>
            ) : (
              '▲ Area for Improvement'
            )}
          </span>

          {/* Metric Source Badge */}
          <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
            {proposal.sourceMetric === 'exam'
              ? 'Exam Data'
              : proposal.sourceMetric === 'attendance'
              ? 'Attendance Record'
              : proposal.sourceMetric === 'assignment'
              ? 'LMS Submissions'
              : 'Teacher Observation'}
          </span>
        </div>

        {/* Validation Status Badge */}
        {isTeacherView && (
          <div>
            {isConfirmed ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-300/60">
                <NavIcon name="check-circle" className="w-3.5 h-3.5" />
                <span>Confirmed &amp; Published</span>
              </span>
            ) : isPending ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-300/70">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 motion-safe:animate-pulse" />
                <span>Pending Teacher Validation</span>
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* Title */}
      <div>
        <h4 className="text-base font-bold text-neutral-900">{proposal.title}</h4>
      </div>

      {/* Content Text / Inline Edit Mode */}
      {isEditing ? (
        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-600 block">
            Edit candidate note before publishing to parents:
          </label>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-purple-300 p-3 text-sm text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 bg-white"
            placeholder="Refine proposal text..."
          />
        </div>
      ) : (
        <p className="text-sm text-neutral-700 leading-relaxed">{displayText}</p>
      )}

      {/* Footer Info: Teacher attribution */}
      <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
        <div>
          {isConfirmed && proposal.teacherName ? (
            <span className="font-semibold text-emerald-800">
              {`Validated by ${proposal.teacherName}`}
              {proposal.confirmedAt && (
                <span className="text-neutral-500 font-normal">
                  {` • ${new Date(proposal.confirmedAt).toLocaleDateString()}`}
                </span>
              )}
            </span>
          ) : (
            <span className="italic text-neutral-500">
              System proposed note • Requires teacher confirmation before visible to parents
            </span>
          )}
        </div>

        {/* Teacher Actions: Confirm, Edit, Dismiss */}
        {isTeacherView && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={actionBusy || isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirm}
                  disabled={actionBusy || isProcessing || !editText.trim()}
                >
                  {actionBusy ? 'Saving...' : 'Save & Confirm'}
                </Button>
              </>
            ) : isPending ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  disabled={actionBusy || isProcessing}
                  className="text-neutral-500 hover:text-rose-600 hover:bg-rose-50"
                >
                  Dismiss
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  disabled={actionBusy || isProcessing}
                >
                  Edit
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirm}
                  disabled={actionBusy || isProcessing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {actionBusy ? 'Confirming...' : 'Confirm'}
                </Button>
              </>
            ) : (
              <span className="text-xs text-neutral-500 font-medium">Visible to parent</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
