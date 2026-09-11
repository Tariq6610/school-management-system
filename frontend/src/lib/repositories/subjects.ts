import { STORAGE_KEYS } from '@/lib/storage';
import { Class, ID, NewSubject, Scope, Subject, Teacher } from '@/types';
import {
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from './base';

export interface SubjectFilter {
  classId?: ID;
  teacherId?: ID;
  campusId?: ID;
  search?: string;
}

export interface SubjectTemplate {
  id: string;
  name: string;
  baseCode: string;
  category: 'core' | 'science' | 'humanities' | 'arts' | 'languages';
  categoryLabel: string;
  description: string;
}

export const SUBJECT_TEMPLATES: SubjectTemplate[] = [
  // Middle School & Primary Core
  {
    id: 'tmpl_eng',
    name: 'English Literature & Grammar',
    baseCode: 'ENG',
    category: 'core',
    categoryLabel: 'Core Curriculum',
    description: 'Reading comprehension, creative writing, and formal grammar',
  },
  {
    id: 'tmpl_mth',
    name: 'Mathematics',
    baseCode: 'MTH',
    category: 'core',
    categoryLabel: 'Core Curriculum',
    description: 'Arithmetic, algebra, geometry, and problem solving',
  },
  {
    id: 'tmpl_sci',
    name: 'General Science',
    baseCode: 'SCI',
    category: 'core',
    categoryLabel: 'Core Curriculum',
    description: 'Integrated physical, chemical, and life sciences',
  },
  {
    id: 'tmpl_urd',
    name: 'Urdu Language & Literature',
    baseCode: 'URD',
    category: 'languages',
    categoryLabel: 'Languages',
    description: 'National language reading, grammar, and classical poetry',
  },
  {
    id: 'tmpl_pst',
    name: 'Pakistan Studies & Islamiyat',
    baseCode: 'PST',
    category: 'core',
    categoryLabel: 'Core Curriculum',
    description: 'National history, geography, and religious/ethical studies',
  },
  {
    id: 'tmpl_ict',
    name: 'Computer Studies & ICT',
    baseCode: 'ICT',
    category: 'science',
    categoryLabel: 'Science & Computing',
    description: 'Digital skills, hardware concepts, and office applications',
  },

  // Secondary Science Stream
  {
    id: 'tmpl_phy',
    name: 'Physics',
    baseCode: 'PHY',
    category: 'science',
    categoryLabel: 'Science & Computing',
    description: 'Kinematics, dynamics, energy, optics, and electricity',
  },
  {
    id: 'tmpl_chm',
    name: 'Chemistry',
    baseCode: 'CHM',
    category: 'science',
    categoryLabel: 'Science & Computing',
    description: 'Atomic structure, chemical reactions, and organic compounds',
  },
  {
    id: 'tmpl_bio',
    name: 'Biology',
    baseCode: 'BIO',
    category: 'science',
    categoryLabel: 'Science & Computing',
    description: 'Cell biology, genetics, ecology, and human physiology',
  },
  {
    id: 'tmpl_cs',
    name: 'Computer Science',
    baseCode: 'CSC',
    category: 'science',
    categoryLabel: 'Science & Computing',
    description: 'Algorithms, structured programming, and database basics',
  },

  // Secondary Humanities & Commerce Stream
  {
    id: 'tmpl_eco',
    name: 'Economics',
    baseCode: 'ECO',
    category: 'humanities',
    categoryLabel: 'Commerce & Humanities',
    description: 'Market structures, national economy, and financial systems',
  },
  {
    id: 'tmpl_acc',
    name: 'Principles of Accounting',
    baseCode: 'ACC',
    category: 'humanities',
    categoryLabel: 'Commerce & Humanities',
    description: 'Double-entry bookkeeping, trial balance, and statements',
  },
  {
    id: 'tmpl_bst',
    name: 'Business Studies',
    baseCode: 'BST',
    category: 'humanities',
    categoryLabel: 'Commerce & Humanities',
    description: 'Business organization, marketing, finance, and human resources',
  },
  {
    id: 'tmpl_geo',
    name: 'World Geography & History',
    baseCode: 'GEO',
    category: 'humanities',
    categoryLabel: 'Commerce & Humanities',
    description: 'Physical geography, global topography, and historical eras',
  },

  // Arts, Languages & Physical
  {
    id: 'tmpl_art',
    name: 'Art & Design',
    baseCode: 'ART',
    category: 'arts',
    categoryLabel: 'Arts & Physical',
    description: 'Visual arts, sketch work, color theory, and studio practice',
  },
  {
    id: 'tmpl_phe',
    name: 'Physical Education & Sports',
    baseCode: 'PHE',
    category: 'arts',
    categoryLabel: 'Arts & Physical',
    description: 'Athletics, team sports, physical fitness, and health education',
  },
  {
    id: 'tmpl_arb',
    name: 'Arabic Language',
    baseCode: 'ARB',
    category: 'languages',
    categoryLabel: 'Languages',
    description: 'Arabic comprehension, grammar, and conversational practice',
  },
];

export function generateSubjectCode(baseCode: string, grade: string): string {
  const cleanGrade = grade.replace(/Grade\s*/i, '').replace(/\s+/g, '');
  return `${baseCode.toUpperCase()}-${cleanGrade || '1'}`;
}

export async function listSubjects(scope: Scope, filter?: SubjectFilter): Promise<Subject[]> {
  // If filter has campusId, we load classes to determine classIds belonging to this campus
  let campusClassIds: Set<string> | null = null;
  if (filter?.campusId) {
    const classes = await listCollection<Class>(STORAGE_KEYS.CLASSES, scope);
    campusClassIds = new Set(
      classes.filter((c) => c.campusId === filter.campusId).map((c) => c.id)
    );
  }

  return listCollection<Subject>(STORAGE_KEYS.SUBJECTS, scope, (subj) => {
    if (filter?.classId && subj.classId !== filter.classId) return false;
    if (filter?.teacherId && subj.teacherId !== filter.teacherId) return false;
    if (campusClassIds && !campusClassIds.has(subj.classId)) return false;
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      const matchName = subj.name.toLowerCase().includes(q);
      const matchCode = subj.code.toLowerCase().includes(q);
      if (!matchName && !matchCode) return false;
    }
    return true;
  });
}

export async function getSubject(id: ID): Promise<Subject | null> {
  return getCollectionItem<Subject>(STORAGE_KEYS.SUBJECTS, id);
}

export async function createSubject(input: NewSubject): Promise<Subject> {
  const created = await createCollectionItem<Subject>(STORAGE_KEYS.SUBJECTS, input, 'sbj');

  // If a teacher was specified on creation, synchronize teacher.subjectIds
  if (input.teacherId) {
    const teacher = await getCollectionItem<Teacher>(STORAGE_KEYS.TEACHERS, input.teacherId);
    if (teacher && !teacher.subjectIds.includes(created.id)) {
      await updateCollectionItem<Teacher>(STORAGE_KEYS.TEACHERS, teacher.id, {
        subjectIds: [...teacher.subjectIds, created.id],
      });
    }
  }

  return created;
}

export async function updateSubject(id: ID, patch: Partial<Subject>): Promise<Subject> {
  const existing = await getSubject(id);
  const updated = await updateCollectionItem<Subject>(STORAGE_KEYS.SUBJECTS, id, patch);

  // If teacher assignment changed, synchronize both old and new teacher records
  if (patch.teacherId !== undefined && existing && existing.teacherId !== patch.teacherId) {
    if (existing.teacherId) {
      const oldTeacher = await getCollectionItem<Teacher>(STORAGE_KEYS.TEACHERS, existing.teacherId);
      if (oldTeacher && oldTeacher.subjectIds.includes(id)) {
        await updateCollectionItem<Teacher>(STORAGE_KEYS.TEACHERS, oldTeacher.id, {
          subjectIds: oldTeacher.subjectIds.filter((sId) => sId !== id),
        });
      }
    }

    if (patch.teacherId) {
      const newTeacher = await getCollectionItem<Teacher>(STORAGE_KEYS.TEACHERS, patch.teacherId);
      if (newTeacher && !newTeacher.subjectIds.includes(id)) {
        await updateCollectionItem<Teacher>(STORAGE_KEYS.TEACHERS, newTeacher.id, {
          subjectIds: [...newTeacher.subjectIds, id],
        });
      }
    }
  }

  return updated;
}

export async function assignSubjectTeacher(
  subjectId: ID,
  teacherId: ID | null
): Promise<Subject> {
  return updateSubject(subjectId, { teacherId: teacherId ?? undefined });
}

export async function deleteSubject(id: ID): Promise<void> {
  const existing = await getSubject(id);

  // Unlink from teacher before deletion
  if (existing?.teacherId) {
    const teacher = await getCollectionItem<Teacher>(STORAGE_KEYS.TEACHERS, existing.teacherId);
    if (teacher && teacher.subjectIds.includes(id)) {
      await updateCollectionItem<Teacher>(STORAGE_KEYS.TEACHERS, teacher.id, {
        subjectIds: teacher.subjectIds.filter((sId) => sId !== id),
      });
    }
  }

  return deleteCollectionItem<Subject>(STORAGE_KEYS.SUBJECTS, id);
}

export interface BulkSubjectItem {
  name: string;
  code: string;
  teacherId?: ID;
}

export async function bulkCreateSubjectsFromTemplates(
  classId: ID,
  items: BulkSubjectItem[],
  scope: Scope
): Promise<Subject[]> {
  const effectiveScope: Scope = scope ?? { schoolId: 'sch_main' };
  const existing = await listSubjects(effectiveScope, { classId });
  const existingNames = new Set(existing.map((s) => s.name.trim().toLowerCase()));
  const existingCodes = new Set(existing.map((s) => s.code.trim().toLowerCase()));

  const createdSubjects: Subject[] = [];

  for (const item of items) {
    const normName = item.name.trim().toLowerCase();
    const normCode = item.code.trim().toLowerCase();

    // Prevent duplicate within the class
    if (existingNames.has(normName) || existingCodes.has(normCode)) {
      continue;
    }

    const created = await createSubject({
      schoolId: effectiveScope.schoolId,
      classId,
      name: item.name.trim(),
      code: item.code.trim().toUpperCase(),
      teacherId: item.teacherId || undefined,
    });

    createdSubjects.push(created);
    existingNames.add(normName);
    existingCodes.add(normCode);
  }

  return createdSubjects;
}
