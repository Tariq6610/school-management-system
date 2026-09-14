'use client';

import React, { useState, useMemo, useId } from 'react';
import { Class, Scope, Subject, Teacher } from '@/types';
import {
  SUBJECT_TEMPLATES,
  SubjectTemplate,
  generateSubjectCode,
  bulkCreateSubjectsFromTemplates,
  BulkSubjectItem,
} from '@/lib/repositories/subjects';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { NavIcon } from '@/components/shell/NavIcon';

export interface BulkSubjectTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  classInfo: Class;
  campusTeachers: Teacher[];
  teacherNames: Map<string, string>;
  existingSubjects: Subject[];
  onSuccess: (newSubjects: Subject[]) => void;
}

export function BulkSubjectTemplateModal({
  isOpen,
  onClose,
  classInfo,
  campusTeachers,
  teacherNames,
  existingSubjects,
  onSuccess,
}: BulkSubjectTemplateModalProps) {
  const { showToast } = useToast();
  const inputId = useId();

  // Category stream filter
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  // Selections: Map template ID to { selected: boolean; teacherId: string }
  const [selections, setSelections] = useState<Record<string, { selected: boolean; teacherId: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set of existing subject normalized names and codes in this class
  const existingSet = useMemo(() => {
    const set = new Set<string>();
    existingSubjects.forEach((s) => {
      set.add(s.name.trim().toLowerCase());
      set.add(s.code.trim().toLowerCase());
    });
    return set;
  }, [existingSubjects]);

  // Map templates with generated code and presence
  const enrichedTemplates = useMemo(() => {
    return SUBJECT_TEMPLATES.map((tmpl) => {
      const code = generateSubjectCode(tmpl.baseCode, classInfo.grade);
      const isAlreadyAdded =
        existingSet.has(tmpl.name.trim().toLowerCase()) ||
        existingSet.has(code.trim().toLowerCase());
      return {
        ...tmpl,
        generatedCode: code,
        isAlreadyAdded,
      };
    });
  }, [classInfo.grade, existingSet]);

  // Filtered by active category
  const displayedTemplates = useMemo(() => {
    if (selectedCategory === 'all') return enrichedTemplates;
    return enrichedTemplates.filter((t) => t.category === selectedCategory);
  }, [enrichedTemplates, selectedCategory]);

  // Selected count
  const selectedCount = useMemo(() => {
    return Object.values(selections).filter((s) => s.selected).length;
  }, [selections]);

  // Toggle selection
  const handleToggleTemplate = (templateId: string) => {
    setSelections((prev) => {
      const curr = prev[templateId];
      return {
        ...prev,
        [templateId]: {
          selected: !curr?.selected,
          teacherId: curr?.teacherId ?? '',
        },
      };
    });
  };

  // Change teacher for selected template
  const handleTeacherChange = (templateId: string, teacherId: string) => {
    setSelections((prev) => ({
      ...prev,
      [templateId]: {
        selected: prev[templateId]?.selected ?? true,
        teacherId,
      },
    }));
  };

  // Batch Accelerators
  const handleSelectStream = (category: SubjectTemplate['category']) => {
    setSelections((prev) => {
      const next = { ...prev };
      enrichedTemplates.forEach((t) => {
        if (t.category === category && !t.isAlreadyAdded) {
          next[t.id] = { selected: true, teacherId: next[t.id]?.teacherId ?? '' };
        }
      });
      return next;
    });
  };

  const handleSelectAllInView = () => {
    setSelections((prev) => {
      const next = { ...prev };
      displayedTemplates.forEach((t) => {
        if (!t.isAlreadyAdded) {
          next[t.id] = { selected: true, teacherId: next[t.id]?.teacherId ?? '' };
        }
      });
      return next;
    });
  };

  const handleClearAll = () => {
    setSelections({});
  };

  // Submit bulk addition
  const handleSave = async () => {
    const selectedTemplateItems: BulkSubjectItem[] = [];

    enrichedTemplates.forEach((t) => {
      if (selections[t.id]?.selected && !t.isAlreadyAdded) {
        selectedTemplateItems.push({
          name: t.name,
          code: t.generatedCode,
          teacherId: selections[t.id].teacherId || undefined,
        });
      }
    });

    if (selectedTemplateItems.length === 0) {
      showToast({
        type: 'error',
        title: 'No subjects selected',
        message: 'Please select at least one subject template to add.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const scope: Scope = { schoolId: classInfo.schoolId, campusId: classInfo.campusId };
      const created = await bulkCreateSubjectsFromTemplates(classInfo.id, selectedTemplateItems, scope);

      showToast({
        type: 'success',
        title: 'Subjects Added Successfully',
        message: `Added ${created.length} subject(s) to ${classInfo.grade} - Section ${classInfo.section}.`,
      });

      onSuccess(created);
      onClose();
      setSelections({});
    } catch (err) {
      console.error('Failed to bulk add subjects:', err);
      showToast({
        type: 'error',
        title: 'Bulk Addition Failed',
        message: 'Could not create subjects from templates.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    { id: 'all', label: 'All Templates' },
    { id: 'core', label: 'Core Curriculum' },
    { id: 'science', label: 'Science & Computing' },
    { id: 'humanities', label: 'Commerce & Humanities' },
    { id: 'languages', label: 'Languages' },
    { id: 'arts', label: 'Arts & Physical' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Subjects from Template List"
      description={`Bulk-populate curriculum subjects for ${classInfo.grade} - Section ${classInfo.section} with standard codes and teacher assignments.`}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-neutral-600 font-medium">
            <span className="tabular-nums font-semibold text-neutral-900">{selectedCount}</span> subject(s) selected
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              isLoading={isSubmitting}
              disabled={selectedCount === 0}
            >
              Add {selectedCount > 0 ? selectedCount : ''} Subject{selectedCount === 1 ? '' : 's'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        {/* Stream Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-neutral-100 rounded-lg">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-white text-brand-navy shadow-xs font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Accelerators Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-neutral-200 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-neutral-500 font-medium">Quick Select:</span>
            <button
              type="button"
              onClick={() => handleSelectStream('core')}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 hover:bg-neutral-200 font-medium transition-colors"
            >
              <NavIcon name="plus" className="w-3 h-3" /> All Core
            </button>
            <button
              type="button"
              onClick={() => handleSelectStream('science')}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 hover:bg-neutral-200 font-medium transition-colors"
            >
              <NavIcon name="plus" className="w-3 h-3" /> Science Stream
            </button>
            <button
              type="button"
              onClick={() => handleSelectStream('humanities')}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 hover:bg-neutral-200 font-medium transition-colors"
            >
              <NavIcon name="plus" className="w-3 h-3" /> Humanities
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllInView}
              className="text-brand-navy hover:underline font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
            >
              Select All in View
            </button>
            <span className="text-neutral-500">|</span>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-neutral-500 hover:text-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Templates List */}
        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
          {displayedTemplates.map((tmpl) => {
            const isSelected = Boolean(selections[tmpl.id]?.selected);
            const teacherId = selections[tmpl.id]?.teacherId ?? '';

            return (
              <div
                key={tmpl.id}
                className={`p-3 rounded-lg border transition-colors ${
                  tmpl.isAlreadyAdded
                    ? 'bg-neutral-50 border-neutral-200 opacity-60'
                    : isSelected
                    ? 'bg-brand-50/50 border-brand-navy/30'
                    : 'bg-white border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <input
                      id={`chk-${tmpl.id}-${inputId}`}
                      type="checkbox"
                      disabled={tmpl.isAlreadyAdded}
                      checked={isSelected || tmpl.isAlreadyAdded}
                      onChange={() => handleToggleTemplate(tmpl.id)}
                      className="mt-1 h-4 w-4 rounded border-neutral-300 text-brand-navy focus:ring-brand-navy disabled:cursor-not-allowed"
                    />
                    <div>
                      <label
                        htmlFor={`chk-${tmpl.id}-${inputId}`}
                        className={`text-sm font-semibold flex items-center gap-2 ${
                          tmpl.isAlreadyAdded ? 'text-neutral-500 cursor-not-allowed' : 'text-neutral-900 cursor-pointer'
                        }`}
                      >
                        {tmpl.name}
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
                          {tmpl.generatedCode}
                        </span>
                        {tmpl.isAlreadyAdded && (
                          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Already added
                          </span>
                        )}
                      </label>
                      <p className="text-xs text-neutral-500 mt-0.5">{tmpl.description}</p>
                    </div>
                  </div>

                  <span className="text-[11px] text-neutral-500 shrink-0 mt-0.5">
                    {tmpl.categoryLabel}
                  </span>
                </div>

                {/* Inline Teacher Picker when selected */}
                {isSelected && !tmpl.isAlreadyAdded && (
                  <div className="mt-3 pt-2 border-t border-brand-navy/10 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-neutral-600 shrink-0">
                      Assign Subject Teacher:
                    </span>
                    <div className="w-64">
                      <Select
                        label="Teacher"
                        value={teacherId}
                        onChange={(e) => handleTeacherChange(tmpl.id, e.target.value)}
                        options={[
                          { value: '', label: 'None (Assign later)' },
                          ...campusTeachers.map((t) => ({
                            value: t.id,
                            label: `${teacherNames.get(t.id) ?? t.employeeNumber} (${t.department})`,
                          })),
                        ]}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
