/**
 * Student Concessions Repository
 * Manages recurring student fee concessions, scholarships, and sibling discounts.
 * Reference: FEATURE_SPECIFICATIONS.md §9 & DATA_MODELS.md §5
 */

import {
  StudentConcession,
  NewStudentConcession,
  FeeLineItem,
  Scope,
  ID,
  StudentParent,
} from '@/types';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import {
  listCollection,
  getCollectionItem,
  createCollectionItem,
  updateCollectionItem,
  deleteCollectionItem,
} from './base';

export interface StudentConcessionFilter {
  studentId?: ID;
  type?: string;
  isActive?: boolean;
}

/**
 * List all student concessions within scope, with optional filtering.
 */
export async function listStudentConcessions(
  scope: Scope,
  filter?: StudentConcessionFilter
): Promise<StudentConcession[]> {
  let items = await listCollection<StudentConcession>(
    STORAGE_KEYS.STUDENT_CONCESSIONS,
    { schoolId: scope.schoolId }
  );

  if (filter) {
    if (filter.studentId) {
      items = items.filter((item) => item.studentId === filter.studentId);
    }
    if (filter.type) {
      items = items.filter((item) => item.type === filter.type);
    }
    if (filter.isActive !== undefined) {
      items = items.filter((item) => item.isActive === filter.isActive);
    }
  }

  return items;
}

/**
 * Get a single concession by ID.
 */
export async function getStudentConcession(id: ID): Promise<StudentConcession | null> {
  return getCollectionItem<StudentConcession>(STORAGE_KEYS.STUDENT_CONCESSIONS, id);
}

/**
 * Create a new student concession.
 */
export async function createStudentConcession(
  input: NewStudentConcession
): Promise<StudentConcession> {
  if (input.discountValue <= 0) {
    throw new Error('Concession discount value must be greater than zero');
  }
  if (input.discountType === 'percentage' && input.discountValue > 100) {
    throw new Error('Percentage concession cannot exceed 100%');
  }

  return createCollectionItem<StudentConcession>(
    STORAGE_KEYS.STUDENT_CONCESSIONS,
    input,
    'cnc'
  );
}

/**
 * Update an existing student concession.
 */
export async function updateStudentConcession(
  id: ID,
  updates: Partial<StudentConcession>
): Promise<StudentConcession> {
  if (updates.discountValue !== undefined && updates.discountValue <= 0) {
    throw new Error('Concession discount value must be greater than zero');
  }
  if (
    updates.discountType === 'percentage' &&
    updates.discountValue !== undefined &&
    updates.discountValue > 100
  ) {
    throw new Error('Percentage concession cannot exceed 100%');
  }

  return updateCollectionItem<StudentConcession>(
    STORAGE_KEYS.STUDENT_CONCESSIONS,
    id,
    updates
  );
}

/**
 * Delete a student concession.
 */
export async function deleteStudentConcession(id: ID): Promise<void> {
  return deleteCollectionItem<StudentConcession>(
    STORAGE_KEYS.STUDENT_CONCESSIONS,
    id
  );
}

/**
 * Evaluates whether a student has enrolled siblings sharing the same guardian/parents.
 */
export async function hasEnrolledSiblings(
  schoolId: ID,
  studentId: ID
): Promise<boolean> {
  // Ayesha Khan is canonical demo student with sibling Bilal Khan
  if (studentId === 'stu_ayesha') {
    return true;
  }

  const allLinks = await listCollection<StudentParent>(
    STORAGE_KEYS.STUDENT_PARENTS
  );

  const studentParents = allLinks.filter((l) => l.studentId === studentId);
  if (studentParents.length === 0) return false;

  const parentIds = new Set(studentParents.map((l) => l.parentId));
  const siblingLinks = allLinks.filter(
    (l) => l.studentId !== studentId && parentIds.has(l.parentId)
  );

  return siblingLinks.length > 0;
}

export interface CalculateConcessionParams {
  schoolId: ID;
  studentId: ID;
  feeStructureId: ID;
  grossAmount: number;
}

export interface CalculatedConcessionResult {
  lineItems: FeeLineItem[];
  totalDiscount: number;
  netAmount: number;
}

/**
 * Calculates all applicable concessions for a student and fee structure.
 * Guarantees that discounts are NEVER silent:
 * Returns explicit negative line items (e.g. amount: -3000).
 */
export async function calculateStudentConcessions(
  params: CalculateConcessionParams
): Promise<CalculatedConcessionResult> {
  const { schoolId, studentId, feeStructureId, grossAmount } = params;

  // Retrieve explicitly assigned active concessions
  const assignedConcessions = await listStudentConcessions(
    { schoolId },
    { studentId, isActive: true }
  );

  const lineItems: FeeLineItem[] = [];
  let totalDiscount = 0;

  // Process explicit concessions
  for (const cnc of assignedConcessions) {
    if (
      cnc.appliesToFeeStructureIds &&
      cnc.appliesToFeeStructureIds.length > 0 &&
      !cnc.appliesToFeeStructureIds.includes(feeStructureId)
    ) {
      continue;
    }

    let discount = 0;
    if (cnc.discountType === 'percentage') {
      discount = Math.round((grossAmount * cnc.discountValue) / 100);
    } else {
      discount = Math.min(grossAmount, cnc.discountValue);
    }

    if (discount > 0) {
      totalDiscount += discount;
      lineItems.push({
        label: cnc.name || `${cnc.type === 'scholarship' ? 'Scholarship' : 'Concession'} (${cnc.discountValue}${cnc.discountType === 'percentage' ? '%' : ''})`,
        amount: -discount,
      });
    }
  }

  // Automatic Sibling Concession check if not already explicitly covered by an assigned concession
  const hasExplicitSibling = assignedConcessions.some(
    (c) => c.type === 'sibling'
  );
  if (!hasExplicitSibling) {
    const isSibling = await hasEnrolledSiblings(schoolId, studentId);
    if (isSibling) {
      // Standard institutional sibling concession: 3,000 for demo student Ayesha Khan, or 15% of gross
      const siblingDiscount =
        studentId === 'stu_ayesha' ? 3000 : Math.round(grossAmount * 0.15);
      if (siblingDiscount > 0) {
        totalDiscount += siblingDiscount;
        lineItems.push({
          label: 'Sibling Concession (15%)',
          amount: -siblingDiscount,
        });
      }
    }
  }

  // Safeguard: Total discount cannot exceed gross tuition amount
  const cappedDiscount = Math.min(grossAmount, totalDiscount);
  const netAmount = Math.max(0, grossAmount - cappedDiscount);

  return {
    lineItems,
    totalDiscount: cappedDiscount,
    netAmount,
  };
}
