'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Campus, Class, ID, Scope, Student, User } from '@/types';
import {
  getChildrenForParent,
  getParent,
  ParentChildInfo,
  updateParent,
} from '@/lib/repositories/parents';
import { getUser, updateUser } from '@/lib/repositories/users';
import { getCampus } from '@/lib/repositories/campuses';
import { listStudents } from '@/lib/repositories/students';
import { listUsers } from '@/lib/repositories/users';
import { listClasses } from '@/lib/repositories/classes';
import {
  linkStudentParent,
  setPrimaryGuardian,
  unlinkStudentParent,
} from '@/lib/repositories/studentParents';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { NavIcon } from '@/components/shell/NavIcon';

export interface ParentProfileViewProps {
  parentId: ID;
}

export function ParentProfileView({ parentId }: ParentProfileViewProps) {
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';

  // Loaded states
  const [user, setUser] = useState<User | null>(null);
  const [occupation, setOccupation] = useState<string>('');
  const [campus, setCampus] = useState<Campus | null>(null);
  const [children, setChildren] = useState<ParentChildInfo[]>([]);
  const [allAvailableStudents, setAllAvailableStudents] = useState<
    Array<{ student: Student; user: User; classStr: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Link Student Modal state
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedStudentIdToLink, setSelectedStudentIdToLink] = useState('');
  const [selectedRelationship, setSelectedRelationship] = useState<
    'father' | 'mother' | 'guardian'
  >('father');
  const [isPrimaryGuardian, setIsPrimaryGuardian] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  // Unlink Confirmation state
  const [childToUnlink, setChildToUnlink] = useState<ParentChildInfo | null>(null);

  // Edit Parent Details Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editOccupation, setEditOccupation] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setNotFound(false);

      const parentRecord = await getParent(parentId);
      if (!parentRecord) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setOccupation(parentRecord.occupation ?? '');

      const parentUser = await getUser(parentRecord.userId);
      if (!parentUser) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }
      setUser(parentUser);

      if (parentUser.campusId) {
        const c = await getCampus(parentUser.campusId);
        setCampus(c);
      }

      // Load children linked to this parent
      const linkedChildren = await getChildrenForParent(parentUser.id);
      setChildren(linkedChildren);

      // Load all available students for linking
      const scope: Scope = { schoolId };
      const [rawStudents, rawUsers, rawClasses] = await Promise.all([
        listStudents(scope),
        listUsers(scope, { role: 'student' }),
        listClasses(scope),
      ]);

      const userMap = new Map<ID, User>();
      rawUsers.forEach((u) => userMap.set(u.id, u));

      const classMap = new Map<ID, Class>();
      rawClasses.forEach((c) => classMap.set(c.id, c));

      // Filter out students already linked
      const linkedStudentIds = new Set(linkedChildren.map((c) => c.student.id));
      const unlinked: Array<{ student: Student; user: User; classStr: string }> = [];

      for (const s of rawStudents) {
        if (!linkedStudentIds.has(s.id)) {
          const u = userMap.get(s.userId);
          if (u) {
            const cls = s.classId ? classMap.get(s.classId) : undefined;
            const classStr = cls ? `${cls.grade}-${cls.section}` : 'Unassigned';
            unlinked.push({ student: s, user: u, classStr });
          }
        }
      }

      setAllAvailableStudents(unlinked);
    } catch (err) {
      console.error('Failed to load parent profile:', err);
      showToast({
        type: 'error',
        title: 'Loading failed',
        message: 'Could not load parent profile information.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [parentId, schoolId, showToast]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) loadData();
    });
    return () => {
      ignore = true;
    };
  }, [loadData]);

  // Open edit modal
  const openEditModal = () => {
    if (!user) return;
    setEditName(user.name);
    setEditPhone(user.phone ?? '');
    setEditOccupation(occupation);
    setIsEditModalOpen(true);
  };

  // Handle Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setIsUpdating(true);
      await updateUser(user.id, {
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
      });

      await updateParent(parentId, {
        occupation: editOccupation.trim() || undefined,
      });

      showToast({
        type: 'success',
        title: 'Profile updated',
        message: 'Parent information has been updated.',
      });
      setIsEditModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to update parent profile:', err);
      showToast({
        type: 'error',
        title: 'Update failed',
        message: 'Could not update parent profile.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Link Student
  const handleLinkStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentIdToLink) {
      showToast({
        type: 'error',
        title: 'Select student',
        message: 'Please choose a student to link.',
      });
      return;
    }

    try {
      setIsLinking(true);
      await linkStudentParent(
        selectedStudentIdToLink,
        parentId,
        selectedRelationship,
        isPrimaryGuardian
      );

      showToast({
        type: 'success',
        title: 'Student linked',
        message: 'Student has been linked to this parent record.',
      });

      setIsLinkModalOpen(false);
      setSelectedStudentIdToLink('');
      setSelectedRelationship('father');
      setIsPrimaryGuardian(false);

      await loadData();
    } catch (err) {
      console.error('Failed to link student:', err);
      showToast({
        type: 'error',
        title: 'Linking failed',
        message: 'Could not link student to parent.',
      });
    } finally {
      setIsLinking(false);
    }
  };

  // Handle Unlink Student
  const handleUnlinkStudent = async () => {
    if (!childToUnlink) return;
    try {
      await unlinkStudentParent(childToUnlink.student.id, parentId);
      showToast({
        type: 'success',
        title: 'Student unlinked',
        message: `${childToUnlink.user.name} has been unlinked from this parent.`,
      });
      setChildToUnlink(null);
      await loadData();
    } catch (err) {
      console.error('Failed to unlink student:', err);
      showToast({
        type: 'error',
        title: 'Unlink failed',
        message: 'Could not unlink student.',
      });
    }
  };

  // Handle Set Primary
  const handleSetPrimary = async (studentId: ID) => {
    try {
      await setPrimaryGuardian(studentId, parentId);
      showToast({
        type: 'success',
        title: 'Primary guardian set',
        message: 'Designated as primary contact for this student.',
      });
      await loadData();
    } catch (err) {
      console.error('Failed to set primary guardian:', err);
      showToast({
        type: 'error',
        title: 'Action failed',
        message: 'Could not update primary guardian status.',
      });
    }
  };

  // Sibling cohort check
  const isSiblingFamily = children.length >= 2;

  if (isLoading) {
    return (
      <div className="py-20 text-center text-ink-500">
        <p className="text-sm">Loading parent record...</p>
      </div>
    );
  }

  if (notFound || !user) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-ink-900">Parent Record Not Found</h2>
        <p className="text-sm text-ink-500">
          The requested parent profile does not exist or has been removed.
        </p>
        <Link href="/admin/parents">
          <Button variant="secondary">Back to Parent Directory</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-ink-500 mb-1">
            <Link href="/admin/parents" className="hover:text-brand-600">
              Parents
            </Link>
            <span>/</span>
            <span className="text-ink-800 font-medium">{user.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-ink-900">{user.name}</h1>
          <p className="text-xs text-ink-500 mt-0.5">Parent ID: {parentId}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/parents">
            <Button variant="ghost" size="sm">
              ← Directory
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={openEditModal}>
            Edit Details
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsLinkModalOpen(true)}
            leftIcon={<NavIcon name="plus" className="w-3.5 h-3.5" />}
          >
            Link Student
          </Button>
        </div>
      </div>

      {/* Sibling Cohort Banner if 2+ children */}
      {isSiblingFamily && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg text-emerald-800 font-bold text-sm">
            <NavIcon name="users" className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-emerald-900">
              Sibling Family Cohort ({children.length} Children Enrolled)
            </h3>
            <p className="text-xs text-emerald-700 mt-0.5">
              {children.map((c) => c.user.name).join(', ')} share this guardian. Sibling
              fee concessions and unified emergency alerts apply to this family unit.
            </p>
          </div>
        </div>
      )}

      {/* Main Profile Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Parent Details Card */}
        <div className="bg-surface rounded-xl border border-rule p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-4">
            <Avatar name={user.name} size="lg" />
            <div>
              <h2 className="text-lg font-bold text-ink-900">{user.name}</h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-brand-50 text-brand-700 border border-brand-200 mt-1">
                Parent / Guardian
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-rule space-y-3 text-xs">
            <div>
              <span className="text-ink-500 font-medium block">Email Address</span>
              <span className="text-ink-900 font-medium mt-0.5 block">{user.email}</span>
            </div>

            <div>
              <span className="text-ink-500 font-medium block">Mobile / WhatsApp</span>
              <span className="text-brand-700 font-mono font-semibold mt-0.5 block">
                {user.phone || 'Not provided'}
              </span>
            </div>

            <div>
              <span className="text-ink-500 font-medium block">Occupation</span>
              <span className="text-ink-900 font-medium mt-0.5 block">
                {occupation || 'Not specified'}
              </span>
            </div>

            <div>
              <span className="text-ink-500 font-medium block">Associated Campus</span>
              <span className="text-ink-900 font-medium mt-0.5 block">
                {campus?.name || 'All / Main Campus'}
              </span>
            </div>

            <div>
              <span className="text-ink-500 font-medium block">Status</span>
              <span className="text-emerald-700 font-medium capitalize mt-0.5 block">
                ● {user.status}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Linked Children (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-surface rounded-xl border border-rule p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-ink-900 text-base">
                  Enrolled Children ({children.length})
                </h2>
                <p className="text-xs text-ink-500 mt-0.5">
                  Students linked to {user.name} across grades and sections.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsLinkModalOpen(true)}
                leftIcon={<NavIcon name="plus" className="w-3.5 h-3.5" />}
              >
                Link Another Child
              </Button>
            </div>

            {children.length === 0 ? (
              <div className="py-10 text-center bg-surface-alt rounded-lg border border-dashed border-rule">
                <p className="text-sm font-semibold text-ink-700">
                  No children currently linked
                </p>
                <p className="text-xs text-ink-500 mt-1 max-w-sm mx-auto">
                  Link an enrolled student to establish guardian relationships, emergency contacts,
                  and sibling cohorts.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  onClick={() => setIsLinkModalOpen(true)}
                >
                  Link Student Now
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {children.map((child) => (
                  <div
                    key={child.student.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-rule hover:border-brand-200 transition-colors bg-surface-alt"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={child.user.name} size="md" />
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/students/${child.student.id}`}
                            className="font-bold text-ink-900 hover:text-brand-600 text-sm"
                          >
                            {child.user.name}
                          </Link>
                          {child.isPrimary ? (
                            <span className="text-[10px] font-bold bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full border border-brand-200">
                              Primary Contact
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSetPrimary(child.student.id)}
                              className="text-[10px] font-medium text-ink-500 hover:text-brand-600 hover:underline"
                              title="Designate this parent as primary contact"
                            >
                              Set as Primary
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500 mt-1">
                          <span>
                            Class:{' '}
                            <strong className="text-ink-800 font-semibold">
                              {child.classInfo
                                ? `${child.classInfo.grade}-${child.classInfo.section}`
                                : 'Unassigned'}
                            </strong>
                          </span>
                          <span>·</span>
                          <span>
                            Admission: #{child.student.admissionNumber}
                          </span>
                          <span>·</span>
                          <span className="capitalize text-brand-700 font-medium">
                            {child.relationship}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Link href={`/admin/students/${child.student.id}`}>
                        <Button variant="ghost" size="sm">
                          View Student
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger-600 hover:bg-danger-50"
                        onClick={() => setChildToUnlink(child)}
                      >
                        Unlink
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Link Student Modal */}
      <Modal
        isOpen={isLinkModalOpen}
        onClose={() => !isLinking && setIsLinkModalOpen(false)}
        title="Link Student to Parent"
      >
        <form onSubmit={handleLinkStudent} className="space-y-4">
          <p className="text-xs text-ink-500">
            Establish a many-to-many relationship between <strong>{user.name}</strong> and an
            enrolled student.
          </p>

          <Select
            label="Select Enrolled Student *"
            value={selectedStudentIdToLink}
            onChange={(e) => setSelectedStudentIdToLink(e.target.value)}
            options={[
              { value: '', label: 'Choose student...' },
              ...allAvailableStudents.map((s) => ({
                value: s.student.id,
                label: `${s.user.name} (${s.classStr}) — #${s.student.admissionNumber}`,
              })),
            ]}
          />

          <Select
            label="Relationship *"
            value={selectedRelationship}
            onChange={(e) =>
              setSelectedRelationship(e.target.value as 'father' | 'mother' | 'guardian')
            }
            options={[
              { value: 'father', label: 'Father' },
              { value: 'mother', label: 'Mother' },
              { value: 'guardian', label: 'Legal Guardian' },
            ]}
          />

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isPrimaryCheckbox"
              checked={isPrimaryGuardian}
              onChange={(e) => setIsPrimaryGuardian(e.target.checked)}
              className="rounded border-rule text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="isPrimaryCheckbox" className="text-xs text-ink-700 font-medium">
              Set as primary guardian for official school notifications (WhatsApp / Calls)
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-rule">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setIsLinkModalOpen(false)}
              disabled={isLinking}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isLinking}>
              {isLinking ? 'Linking...' : 'Link Student'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Parent Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => !isUpdating && setIsEditModalOpen(false)}
        title="Edit Parent Details"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Input
            label="Full Name *"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />
          <Input
            label="Mobile / WhatsApp"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
          />
          <Input
            label="Occupation"
            value={editOccupation}
            onChange={(e) => setEditOccupation(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-rule">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Unlink Dialog */}
      <ConfirmDialog
        isOpen={Boolean(childToUnlink)}
        recordName={childToUnlink ? `${childToUnlink.user.name}'s association` : 'Association'}
        actionType="delete"
        title="Unlink Student"
        message={`Are you sure you want to unlink ${childToUnlink?.user.name} from ${user.name}? This will remove the guardian association for this student.`}
        confirmLabel="Unlink Student"
        onConfirm={handleUnlinkStudent}
        onClose={() => setChildToUnlink(null)}
      />
    </div>
  );
}
