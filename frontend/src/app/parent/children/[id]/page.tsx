'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { Student, User, Class, HealthRecord, PickupPerson } from '@/types';
import {
  getStudent,
  addAuthorizedPickupPerson,
  removeAuthorizedPickupPerson,
  updateStudentHealth,
} from '@/lib/repositories/students';
import { getUser } from '@/lib/repositories/users';
import { getClass } from '@/lib/repositories/classes';
import { ParentChildProfileView } from '@/components/parent/ParentChildProfileView';

export default function ChildHealthAndPickupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.id;
  const { session } = useSession();
  const { showToast } = useToast();

  const [student, setStudent] = useState<Student | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const s = await getStudent(studentId);
      if (!s) {
        setStudent(null);
        return;
      }
      setStudent(s);

      const [u, c] = await Promise.all([
        getUser(s.userId),
        getClass(s.classId),
      ]);
      setUser(u);
      setClassInfo(c);
    } catch {
      showToast({ type: 'error', title: 'Error', message: 'Failed to load child records.' });
    } finally {
      setIsLoading(false);
    }
  }, [studentId, showToast]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) {
        loadData();
      }
    });
    return () => {
      ignore = true;
    };
  }, [loadData]);

  const handleAddPickupPerson = async (person: Omit<PickupPerson, 'addedBy' | 'addedAt'>) => {
    if (!student || !session) return;
    try {
      const updated = await addAuthorizedPickupPerson(student.id, person, session.userId);
      setStudent(updated);
      showToast({ type: 'success', title: 'Authorized', message: `${person.name} authorized for pickup.` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add pickup authorization';
      showToast({ type: 'error', title: 'Error', message: msg });
      throw err;
    }
  };

  const handleRemovePickupPerson = async (phoneOrName: string) => {
    if (!student) return;
    try {
      const updated = await removeAuthorizedPickupPerson(student.id, phoneOrName);
      setStudent(updated);
      showToast({ type: 'success', title: 'Revoked', message: 'Pickup authorization revoked.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove pickup person';
      showToast({ type: 'error', title: 'Error', message: msg });
      throw err;
    }
  };

  const handleUpdateHealth = async (patch: Partial<HealthRecord>) => {
    if (!student) return;
    try {
      const updated = await updateStudentHealth(student.id, patch);
      setStudent(updated);
      showToast({ type: 'success', title: 'Saved', message: 'Medical profile updated successfully.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update health profile';
      showToast({ type: 'error', title: 'Error', message: msg });
      throw err;
    }
  };

  return (
    <RouteGuard allowedRoles={['parent', 'school_admin', 'super_admin']}>
      <AppShell pageTitle="Child Health & Pickup Authorizations">
        <div className="p-6">
          {isLoading ? (
            <div className="p-8 text-neutral-500 text-center">Loading student profile...</div>
          ) : !student ? (
            <div className="p-8 text-center bg-white rounded-xl border border-neutral-200">
              <p className="text-neutral-600 font-medium">Student record not found.</p>
            </div>
          ) : (
            <ParentChildProfileView
              student={student}
              user={user ?? undefined}
              classInfo={classInfo}
              onAddPickupPerson={handleAddPickupPerson}
              onRemovePickupPerson={handleRemovePickupPerson}
              onUpdateHealth={handleUpdateHealth}
            />
          )}
        </div>
      </AppShell>
    </RouteGuard>
  );
}
