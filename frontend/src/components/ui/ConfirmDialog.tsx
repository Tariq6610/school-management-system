'use client';

import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export type ConfirmActionType = 'delete' | 'archive' | 'warning' | 'confirm';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  /**
   * Strictly required per UI_DESIGN_SYSTEM.md §6 & Acceptance Criteria.
   * e.g. "Ahmed Khan's record" or "Grade 8-A Fee Structure"
   */
  recordName: string;
  actionType?: ConfirmActionType;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  recordName,
  actionType = 'delete',
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  isLoading = false,
}: ConfirmDialogProps) {
  const isDestructive = actionType === 'delete';

  const defaultTitle = isDestructive
    ? `Delete ${recordName}?`
    : `Confirm action on ${recordName}?`;

  const defaultMessage = isDestructive
    ? `Are you sure you want to permanently delete ${recordName}? This action cannot be undone.`
    : `Please confirm you want to proceed with this action on ${recordName}.`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title ?? defaultTitle}
      size="sm"
      closeOnBackdropClick={!isLoading}
      footer={
        <>
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? 'danger' : 'primary'}
            size="md"
            isLoading={isLoading}
            onClick={onConfirm}
          >
            {confirmLabel ?? (isDestructive ? 'Delete Record' : 'Confirm')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {/* Warning Icon Banner */}
        <div className="flex items-start gap-3">
          <div
            className={`
              flex h-10 w-10 shrink-0 items-center justify-center rounded-full
              ${isDestructive ? 'bg-absent-bg text-absent' : 'bg-late-bg text-late'}
            `}
            aria-hidden="true"
          >
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>

          <div className="space-y-1">
            <p className="text-body-custom text-ink-900 font-medium">
              Record: <strong className="text-ink-900 underline decoration-rule decoration-2 underline-offset-2">{recordName}</strong>
            </p>
            <p className="text-secondary-meta text-ink-600">
              {message ?? defaultMessage}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
