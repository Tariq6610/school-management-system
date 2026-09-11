'use client';

import React, { useState } from 'react';
import { Announcement, AudienceType, Campus, Class } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface AnnouncementComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    body: string;
    audience: AudienceType;
    campusId?: string;
    classId?: string;
    publishAt: string;
    expiresAt?: string;
  }) => Promise<void>;
  initialAnnouncement?: Announcement | null;
  campuses: Campus[];
  classes: Class[];
  defaultCampusId?: string;
}

function toLocalDatetimeInputString(isoDateString?: string): string {
  if (!isoDateString) return '';
  const d = new Date(isoDateString);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const Y = d.getFullYear();
  const M = pad(d.getMonth() + 1);
  const D = pad(d.getDate());
  const h = pad(d.getHours());
  const m = pad(d.getMinutes());
  return `${Y}-${M}-${D}T${h}:${m}`;
}

export function AnnouncementComposerModal({
  isOpen,
  onClose,
  onSave,
  initialAnnouncement,
  campuses,
  classes,
  defaultCampusId,
}: AnnouncementComposerModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialAnnouncement ? 'Edit Announcement' : 'Compose Announcement'}
      description="Create an announcement for the school community. Target all campuses, a specific campus, or a specific class."
      size="lg"
      className="max-w-2xl"
    >
      <AnnouncementComposerForm
        key={initialAnnouncement ? initialAnnouncement.id : 'new-announcement'}
        onClose={onClose}
        onSave={onSave}
        initialAnnouncement={initialAnnouncement}
        campuses={campuses}
        classes={classes}
        defaultCampusId={defaultCampusId}
      />
    </Modal>
  );
}

interface AnnouncementComposerFormProps {
  onClose: () => void;
  onSave: (data: {
    title: string;
    body: string;
    audience: AudienceType;
    campusId?: string;
    classId?: string;
    publishAt: string;
    expiresAt?: string;
  }) => Promise<void>;
  initialAnnouncement?: Announcement | null;
  campuses: Campus[];
  classes: Class[];
  defaultCampusId?: string;
}

function AnnouncementComposerForm({
  onClose,
  onSave,
  initialAnnouncement,
  campuses,
  classes,
  defaultCampusId,
}: AnnouncementComposerFormProps) {
  const [title, setTitle] = useState(initialAnnouncement?.title || '');
  const [body, setBody] = useState(initialAnnouncement?.body || '');
  const [audience, setAudience] = useState<AudienceType>(
    initialAnnouncement?.audience || (defaultCampusId ? 'campus' : 'school')
  );
  const [campusId, setCampusId] = useState<string>(
    initialAnnouncement?.campusId || defaultCampusId || (campuses[0]?.id ?? '')
  );
  const [classId, setClassId] = useState<string>(
    initialAnnouncement?.classId || ''
  );

  // Publish date (defaults to current time if creating)
  const defaultPublishLocal = toLocalDatetimeInputString(
    initialAnnouncement?.publishAt || new Date().toISOString()
  );
  const [publishAtLocal, setPublishAtLocal] = useState(defaultPublishLocal);

  // Optional Expiry date
  const defaultExpiryLocal = toLocalDatetimeInputString(
    initialAnnouncement?.expiresAt
  );
  const [expiresAtLocal, setExpiresAtLocal] = useState(defaultExpiryLocal);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter classes by selected campus
  const availableClasses = classes.filter(
    (cls) => !campusId || cls.campusId === campusId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanTitle = title.trim();
    const cleanBody = body.trim();

    if (!cleanTitle) {
      setErrorMsg('Announcement title is required.');
      return;
    }
    if (!cleanBody) {
      setErrorMsg('Announcement message body is required.');
      return;
    }

    if (audience === 'campus' && !campusId) {
      setErrorMsg('Please select a target campus.');
      return;
    }

    if (audience === 'class') {
      if (!campusId) {
        setErrorMsg('Please select a campus for the target class.');
        return;
      }
      if (!classId) {
        setErrorMsg('Please select a target class.');
        return;
      }
    }

    if (!publishAtLocal) {
      setErrorMsg('A valid publication date and time is required.');
      return;
    }

    const publishDate = new Date(publishAtLocal);
    if (isNaN(publishDate.getTime())) {
      setErrorMsg('Invalid publication date.');
      return;
    }

    let expiresDateIso: string | undefined = undefined;
    if (expiresAtLocal && expiresAtLocal.trim()) {
      const expireDate = new Date(expiresAtLocal);
      if (isNaN(expireDate.getTime())) {
        setErrorMsg('Invalid expiry date.');
        return;
      }
      if (expireDate.getTime() <= publishDate.getTime()) {
        setErrorMsg('Expiry date must be after the publication date.');
        return;
      }
      expiresDateIso = expireDate.toISOString();
    }

    setIsSubmitting(true);
    try {
      await onSave({
        title: cleanTitle,
        body: cleanBody,
        audience,
        campusId: audience === 'school' ? undefined : campusId,
        classId: audience === 'class' ? classId : undefined,
        publishAt: publishDate.toISOString(),
        expiresAt: expiresDateIso,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save announcement';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label
          htmlFor="announcement-title"
          className="block text-xs font-semibold text-neutral-800 mb-1"
        >
          Announcement Title <span className="text-rose-600">*</span>
        </label>
        <input
          id="announcement-title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Annual Sports Day & Schedule Announcement"
          className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-neutral-900"
        />
      </div>

      {/* Target Audience Selector (School, Campus, Class) */}
      <div>
        <span className="block text-xs font-semibold text-neutral-800 mb-1.5">
          Target Audience <span className="text-rose-600">*</span>
        </span>
        <div className="grid grid-cols-3 gap-2">
          <label
            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border cursor-pointer transition-all text-xs text-center ${
              audience === 'school'
                ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600 text-blue-900 font-bold'
                : 'border-neutral-200 hover:border-neutral-300 bg-white text-neutral-700'
            }`}
          >
            <input
              type="radio"
              name="audience"
              value="school"
              checked={audience === 'school'}
              onChange={() => setAudience('school')}
              className="sr-only"
            />
            <span className="block font-semibold">Entire School</span>
            <span className="text-[10px] text-neutral-500 mt-0.5">All campuses &amp; classes</span>
          </label>

          <label
            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border cursor-pointer transition-all text-xs text-center ${
              audience === 'campus'
                ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600 text-blue-900 font-bold'
                : 'border-neutral-200 hover:border-neutral-300 bg-white text-neutral-700'
            }`}
          >
            <input
              type="radio"
              name="audience"
              value="campus"
              checked={audience === 'campus'}
              onChange={() => setAudience('campus')}
              className="sr-only"
            />
            <span className="block font-semibold">Specific Campus</span>
            <span className="text-[10px] text-neutral-500 mt-0.5">Single campus community</span>
          </label>

          <label
            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border cursor-pointer transition-all text-xs text-center ${
              audience === 'class'
                ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600 text-blue-900 font-bold'
                : 'border-neutral-200 hover:border-neutral-300 bg-white text-neutral-700'
            }`}
          >
            <input
              type="radio"
              name="audience"
              value="class"
              checked={audience === 'class'}
              onChange={() => setAudience('class')}
              className="sr-only"
            />
            <span className="block font-semibold">Specific Class</span>
            <span className="text-[10px] text-neutral-500 mt-0.5">Single class cohort</span>
          </label>
        </div>
      </div>

      {/* Conditional Scoping Dropdowns */}
      {(audience === 'campus' || audience === 'class') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
          <div>
            <label
              htmlFor="announcement-campus"
              className="block text-xs font-semibold text-neutral-800 mb-1"
            >
              Select Campus <span className="text-rose-600">*</span>
            </label>
            <select
              id="announcement-campus"
              required
              value={campusId}
              onChange={(e) => {
                setCampusId(e.target.value);
                setClassId(''); // reset class when campus changes
              }}
              className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-neutral-800 font-medium"
            >
              <option value="">-- Choose Campus --</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.isPrimary ? '(Primary)' : ''}
                </option>
              ))}
            </select>
          </div>

          {audience === 'class' && (
            <div>
              <label
                htmlFor="announcement-class"
                className="block text-xs font-semibold text-neutral-800 mb-1"
              >
                Select Class <span className="text-rose-600">*</span>
              </label>
              <select
                id="announcement-class"
                required
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-neutral-800 font-medium"
              >
                <option value="">-- Choose Class --</option>
                {availableClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.grade} ({cls.section})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Message Body */}
      <div>
        <label
          htmlFor="announcement-body"
          className="block text-xs font-semibold text-neutral-800 mb-1"
        >
          Message Body <span className="text-rose-600">*</span>
        </label>
        <textarea
          id="announcement-body"
          required
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type the announcement details, instructions, or notice here..."
          className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-neutral-800 leading-relaxed"
        />
      </div>

      {/* Publication Date and Expiry Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="announcement-publish"
            className="block text-xs font-semibold text-neutral-800 mb-1"
          >
            Publish Date &amp; Time <span className="text-rose-600">*</span>
          </label>
          <input
            id="announcement-publish"
            type="datetime-local"
            required
            value={publishAtLocal}
            onChange={(e) => setPublishAtLocal(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-neutral-800 font-medium"
          />
          <p className="text-[10px] text-neutral-400 mt-1">
            Setting a future date schedules the announcement.
          </p>
        </div>

        <div>
          <label
            htmlFor="announcement-expire"
            className="block text-xs font-semibold text-neutral-800 mb-1"
          >
            Expiry Date &amp; Time <span className="text-neutral-400 font-normal">(Optional)</span>
          </label>
          <input
            id="announcement-expire"
            type="datetime-local"
            value={expiresAtLocal}
            onChange={(e) => setExpiresAtLocal(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-neutral-800 font-medium"
          />
          <p className="text-[10px] text-neutral-400 mt-1">
            Announcement will automatically hide after this date.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
          {errorMsg}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
        <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Saving...'
            : initialAnnouncement
            ? 'Update Announcement'
            : 'Publish Announcement'}
        </Button>
      </div>
    </form>
  );
}
