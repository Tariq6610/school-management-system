'use client';

import React, { useState } from 'react';
import { PickupPerson } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export interface PickupPersonListProps {
  pickupPersons: PickupPerson[];
  onAddPickupPerson: (person: Omit<PickupPerson, 'addedBy' | 'addedAt'>) => Promise<void>;
  onRemovePickupPerson: (phoneOrName: string) => Promise<void>;
  isReadOnly?: boolean;
}

export function PickupPersonList({
  pickupPersons,
  onAddPickupPerson,
  onRemovePickupPerson,
  isReadOnly = false,
}: PickupPersonListProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deletion state
  const [personToRemove, setPersonToRemove] = useState<PickupPerson | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const resetForm = () => {
    setName('');
    setRelationship('');
    setPhone('');
    setPhotoUrl('');
    setFormError(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleCloseAdd = () => {
    setIsAddModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (!relationship.trim()) {
      setFormError('Relationship is required.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Phone number is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await onAddPickupPerson({
        name: name.trim(),
        relationship: relationship.trim(),
        phone: phone.trim(),
        photoUrl: photoUrl.trim() || undefined,
      });
      handleCloseAdd();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to add pickup person.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!personToRemove) return;
    try {
      setIsRemoving(true);
      await onRemovePickupPerson(personToRemove.phone || personToRemove.name);
      setPersonToRemove(null);
    } catch {
      // Handled by parent toast if any
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
      <div className="p-5 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-neutral-900">Authorized Pickup Persons</h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
              {pickupPersons.length}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Designated adults allowed to pick up this student from school campus.
          </p>
        </div>
        {!isReadOnly && (
          <Button
            size="sm"
            onClick={handleOpenAdd}
            data-testid="add-pickup-btn"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Pickup Person
          </Button>
        )}
      </div>

      {pickupPersons.length === 0 ? (
        <div className="p-8 text-center" data-testid="pickup-empty-state">
          <div className="w-12 h-12 mx-auto rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="text-sm font-medium text-neutral-800">No Authorized Pickup Persons</div>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            Only registered parents/guardians are currently authorized to sign out this student.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-neutral-200">
          {pickupPersons.map((person, idx) => (
            <div
              key={`${person.name}-${person.phone}-${idx}`}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-50/60 transition-colors"
              data-testid={`pickup-item-${idx}`}
            >
              <div className="flex items-start sm:items-center gap-3.5">
                <Avatar name={person.name} src={person.photoUrl} size="md" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-neutral-900">{person.name}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-brand-navy-light/10 text-brand-navy border border-brand-navy-light/20">
                      {person.relationship}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-neutral-600 flex-wrap">
                    <a
                      href={`tel:${person.phone}`}
                      className="inline-flex items-center gap-1 font-mono text-neutral-800 hover:text-brand-navy transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {person.phone}
                    </a>
                  </div>

                  {/* Audit Trail: who added and when */}
                  <div className="mt-2 flex items-center gap-1.5 text-2xs text-neutral-500" data-testid="pickup-audit-trail">
                    <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      {`Authorized on ${new Date(person.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}${person.addedBy ? ` by ID: ${person.addedBy}` : ''}`}
                    </span>
                  </div>
                </div>
              </div>

              {!isReadOnly && (
                <div className="sm:self-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    onClick={() => setPersonToRemove(person)}
                    data-testid={`remove-pickup-${idx}`}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Pickup Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={handleCloseAdd}
        title="Add Authorized Pickup Person"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {formError}
            </div>
          )}

          <div>
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Eleanor Vance"
              required
            />
          </div>

          <div>
            <Input
              label="Relationship"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="e.g. Grandmother, Babysitter, Uncle"
              required
            />
          </div>

          <div>
            <Input
              label="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +1 555-0199"
              required
            />
          </div>

          <div>
            <Input
              label="Photo URL (Optional)"
              hint="Staff will compare this photo with the ID presented during pickup."
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="pt-3 border-t border-neutral-200 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseAdd}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Authorize Person'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog for Removal */}
      <ConfirmDialog
        isOpen={Boolean(personToRemove)}
        onClose={() => setPersonToRemove(null)}
        onConfirm={handleConfirmRemove}
        recordName={personToRemove?.name ?? 'Pickup Authorization'}
        actionType="delete"
        title="Revoke Pickup Authorization"
        message={`Are you sure you want to revoke pickup authorization for ${personToRemove?.name}? School staff will no longer release the student to this person.`}
        confirmLabel={isRemoving ? 'Revoking...' : 'Revoke Authorization'}
        isLoading={isRemoving}
      />
    </div>
  );
}
