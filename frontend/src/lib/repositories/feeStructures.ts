import { STORAGE_KEYS } from '@/lib/storage';
import { FeeInvoice, FeeStructure, ID, NewFeeStructure, Scope, FeeFrequency } from '@/types';
import {
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from './base';

export interface FeeStructureFilter {
  campusId?: ID;
  classId?: ID;
  frequency?: FeeFrequency;
  search?: string;
}

export async function listFeeStructures(
  scope: Scope,
  filter?: FeeStructureFilter
): Promise<FeeStructure[]> {
  return listCollection<FeeStructure>(
    STORAGE_KEYS.FEE_STRUCTURES,
    scope,
    (item) => {
      if (filter?.campusId && item.campusId && item.campusId !== filter.campusId) {
        return false;
      }
      if (filter?.classId && !item.appliesToClassIds.includes(filter.classId)) {
        return false;
      }
      if (filter?.frequency && item.frequency !== filter.frequency) {
        return false;
      }
      if (filter?.search) {
        const q = filter.search.toLowerCase();
        return item.name.toLowerCase().includes(q);
      }
      return true;
    }
  );
}

export async function getFeeStructure(id: ID): Promise<FeeStructure | null> {
  return getCollectionItem<FeeStructure>(STORAGE_KEYS.FEE_STRUCTURES, id);
}

export async function createFeeStructure(input: NewFeeStructure): Promise<FeeStructure> {
  return createCollectionItem<FeeStructure>(STORAGE_KEYS.FEE_STRUCTURES, input, 'fst');
}

export async function updateFeeStructure(
  id: ID,
  patch: Partial<FeeStructure>
): Promise<FeeStructure> {
  return updateCollectionItem<FeeStructure>(STORAGE_KEYS.FEE_STRUCTURES, id, patch);
}

export async function deleteFeeStructure(id: ID): Promise<void> {
  return deleteCollectionItem<FeeStructure>(STORAGE_KEYS.FEE_STRUCTURES, id);
}

export async function getFeeStructuresForClass(
  scope: Scope,
  classId: ID
): Promise<FeeStructure[]> {
  return listFeeStructures(scope, { classId });
}

export async function canDeleteFeeStructure(
  id: ID
): Promise<{ canDelete: boolean; reason?: string }> {
  const invoices = await listCollection<FeeInvoice>(
    STORAGE_KEYS.FEE_INVOICES,
    undefined,
    (inv) => inv.feeStructureId === id
  );
  if (invoices.length > 0) {
    return {
      canDelete: false,
      reason: `Cannot delete fee structure: ${invoices.length} existing invoice(s) reference it.`,
    };
  }
  return { canDelete: true };
}
