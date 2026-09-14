'use client';

import React, { useState, useMemo } from 'react';
import { EligibleRecipient } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: EligibleRecipient[];
  loading: boolean;
  onSelectRecipient: (recipient: EligibleRecipient) => void;
  currentUserRole: 'teacher' | 'parent';
}

export function NewConversationModal({
  isOpen,
  onClose,
  recipients,
  loading,
  onSelectRecipient,
  currentUserRole,
}: NewConversationModalProps) {
  const [search, setSearch] = useState('');

  const filteredRecipients = useMemo(() => {
    if (!search.trim()) return recipients;
    const q = search.toLowerCase();
    return recipients.filter((r) => {
      const matchName = r.user.name.toLowerCase().includes(q);
      const matchStudent = r.studentName ? r.studentName.toLowerCase().includes(q) : false;
      const matchClass = r.className ? r.className.toLowerCase().includes(q) : false;
      const matchSubject = r.subjectNames
        ? r.subjectNames.some((s) => s.toLowerCase().includes(q))
        : false;
      return matchName || matchStudent || matchClass || matchSubject;
    });
  }, [recipients, search]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={currentUserRole === 'teacher' ? 'New Message to Parent' : 'Contact Teacher'}
      size="lg"
    >
      <div className="space-y-4">
        <p className="text-xs text-neutral-500">
          {currentUserRole === 'teacher'
            ? 'Select a parent from your assigned classes or cohort to begin a direct conversation.'
            : 'Select a teacher teaching your child to initiate a discussion.'}
        </p>

        {/* Search Input */}
        <div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              currentUserRole === 'teacher'
                ? 'Search by parent name, student, or grade...'
                : 'Search by teacher name, subject, or class...'
            }
            className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition-all placeholder:text-neutral-500"
            autoFocus
          />
        </div>

        {/* Recipient list */}
        <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100 border border-neutral-200/80 rounded-xl">
          {loading ? (
            <div className="p-8 text-center text-xs text-neutral-500">
              <div className="inline-block w-5 h-5 border-2 border-neutral-300 border-t-primary-600 rounded-full animate-spin mb-2" />
              <p>Loading available contacts...</p>
            </div>
          ) : filteredRecipients.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-500">
              {search ? 'No contacts match your search.' : 'No eligible contacts found.'}
            </div>
          ) : (
            filteredRecipients.map((recipient) => (
              <button
                key={recipient.userId}
                type="button"
                onClick={() => {
                  onSelectRecipient(recipient);
                  onClose();
                }}
                className="w-full text-left p-3.5 hover:bg-neutral-50 transition-colors flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {recipient.user.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-neutral-900 truncate group-hover:text-primary-700 transition-colors">
                        {recipient.user.name}
                      </span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 capitalize">
                        {recipient.role}
                      </span>
                    </div>

                    <div className="text-xs text-neutral-500 truncate flex items-center gap-1.5 mt-0.5">
                      {recipient.studentName && (
                        <span>
                          {recipient.role === 'parent' ? 'Parent of' : 'Student:'}{' '}
                          <strong className="text-neutral-700 font-medium">
                            {recipient.studentName}
                          </strong>
                        </span>
                      )}
                      {recipient.className && (
                        <span className="text-neutral-500">({recipient.className})</span>
                      )}
                      {recipient.subjectNames && recipient.subjectNames.length > 0 && (
                        <span className="text-primary-600 font-medium">
                          • {recipient.subjectNames.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <span className="text-xs font-semibold text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  Message →
                </span>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
