'use client';

import React, { useState } from 'react';
import {
  CallOutcome,
  LogCallInput,
  OutreachCallRecord,
  ParentOutreachPromptItem,
  logOutreachCall,
} from '@/lib/repositories/parentOutreach';
import { useSession } from '@/components/providers/SessionProvider';
import { Button } from '@/components/ui/Button';

export interface LogOutreachCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptItem: ParentOutreachPromptItem;
  onSuccess: (record: OutreachCallRecord) => void;
}

export function LogOutreachCallModal({
  isOpen,
  onClose,
  promptItem,
  onSuccess,
}: LogOutreachCallModalProps) {
  const { session } = useSession();
  const [outcome, setOutcome] = useState<CallOutcome>('spoke_with_parent');
  const [contactPerson, setContactPerson] = useState(promptItem.parentUser.name);
  const [phone, setPhone] = useState(promptItem.primaryPhone);
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      setErrorMsg('Please enter a brief note detailing the call outcome.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const scope = {
        schoolId: session?.schoolId || 'sch_main',
        campusId: session?.campusId,
      };

      const input: LogCallInput = {
        parentId: promptItem.parentId,
        familyTitle: promptItem.familyTitle,
        contactPerson: contactPerson.trim(),
        phoneNumber: phone.trim(),
        outcome,
        notes: notes.trim(),
        loggedByUserId: session?.userId || 'usr_admin',
        loggedByName: session?.role === 'teacher' ? 'Faculty Teacher' : 'School Administrator',
        followUpDate: followUpDate || undefined,
      };

      const recorded = await logOutreachCall(scope, input);
      onSuccess(recorded);
      onClose();
    } catch (err) {
      console.error('Failed to log outreach call:', err);
      setErrorMsg('Failed to save call log. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 max-w-lg w-full shadow-xl space-y-4 animate-in fade-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
              Parent Outreach Log
            </span>
            <h3 className="text-lg font-bold text-neutral-900 mt-1">
              Log Outreach Call — {promptItem.familyTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 text-lg font-bold p-1"
          >
            ✕
          </button>
        </div>

        {/* Prompt Context Notice */}
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
          <p className="font-semibold">Reason for Outreach:</p>
          <p className="text-amber-800">{promptItem.promptReason}</p>
          {promptItem.children.length > 0 && (
            <p className="text-[11px] text-neutral-500 pt-1 border-t border-amber-200/60">
              Enrolled Children:{' '}
              <strong className="text-neutral-800">
                {promptItem.children.map((c) => `${c.name} (${c.className})`).join(', ')}
              </strong>
            </p>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">
                Contact Person
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                required
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1">
              Call Outcome
            </label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as CallOutcome)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 bg-white"
            >
              <option value="spoke_with_parent">Spoke with parent / guardian</option>
              <option value="left_voicemail">Left voicemail / audio message</option>
              <option value="no_answer">No answer / line busy</option>
              <option value="requested_callback">Parent requested scheduled callback</option>
              <option value="wrong_number">Wrong number / disconnected</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1">
              Outreach Notes &amp; Action Plan
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Mother confirmed receipt of homework notices. Works late shifts; requested SMS / WhatsApp reminders after 5 PM."
              required
              className="w-full rounded-xl border border-neutral-200 p-3 text-xs text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1">
              Follow-up Date (Optional)
            </label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={isSubmitting || !notes.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSubmitting ? 'Logging...' : 'Save Call Log'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
