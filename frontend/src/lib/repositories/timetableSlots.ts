import { STORAGE_KEYS } from '@/lib/storage';
import {
  DayOfWeek,
  ID,
  NewTimetableSlot,
  Scope,
  TimetableSlot,
  EnrichedTimetableSlot,
} from '@/types';
import {
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from './base';
import { listTeachers } from './teachers';
import { listUsers } from './users';
import { listSubjects } from './subjects';
import { listClasses } from './classes';
import { listCampuses } from './campuses';
import { getSettings } from './settings';

export type { EnrichedTimetableSlot };

export interface TimetableFilter {
  teacherId?: ID;
  dayOfWeek?: DayOfWeek;
  period?: number;
  classId?: ID;
  campusId?: ID;
  subjectId?: ID;
  room?: string;
}

export async function listTimetableSlots(
  scope: Scope,
  filter?: TimetableFilter
): Promise<TimetableSlot[]> {
  return listCollection<TimetableSlot>(STORAGE_KEYS.TIMETABLE_SLOTS, scope, (slot) => {
    if (filter?.teacherId && slot.teacherId !== filter.teacherId) return false;
    if (filter?.dayOfWeek && slot.dayOfWeek !== filter.dayOfWeek) return false;
    if (filter?.period && slot.period !== filter.period) return false;
    if (filter?.classId && slot.classId !== filter.classId) return false;
    if (filter?.campusId && slot.campusId !== filter.campusId) return false;
    if (filter?.subjectId && slot.subjectId !== filter.subjectId) return false;
    if (filter?.room && slot.room !== filter.room) return false;
    return true;
  });
}

export async function getTimetableSlot(id: ID): Promise<TimetableSlot | null> {
  return getCollectionItem<TimetableSlot>(STORAGE_KEYS.TIMETABLE_SLOTS, id);
}

/**
 * Creates a new timetable slot. If startTime and endTime are not provided,
 * automatically resolves them from the school's configured period times in settings.
 */
export async function createTimetableSlot(input: NewTimetableSlot): Promise<TimetableSlot> {
  let startTime = input.startTime;
  let endTime = input.endTime;

  if (!startTime || !endTime) {
    const settings = await getSettings({ schoolId: input.schoolId, campusId: input.campusId });
    const periodDef = (settings.periods || []).find((p) => p.period === input.period);
    if (periodDef) {
      startTime = startTime || periodDef.startTime;
      endTime = endTime || periodDef.endTime;
    } else {
      startTime = startTime || '08:00';
      endTime = endTime || '08:45';
    }
  }

  const slotData: Omit<TimetableSlot, 'id'> = {
    ...input,
    startTime,
    endTime,
  };

  return createCollectionItem<TimetableSlot>(STORAGE_KEYS.TIMETABLE_SLOTS, slotData, 'tts');
}

export async function updateTimetableSlot(
  id: ID,
  patch: Partial<TimetableSlot>
): Promise<TimetableSlot> {
  return updateCollectionItem<TimetableSlot>(STORAGE_KEYS.TIMETABLE_SLOTS, id, patch);
}

export async function deleteTimetableSlot(id: ID): Promise<void> {
  return deleteCollectionItem<TimetableSlot>(STORAGE_KEYS.TIMETABLE_SLOTS, id);
}

/**
 * Returns timetable slots enriched with human-readable teacher names,
 * subject names, class names, and period labels.
 */
export async function getEnrichedTimetableSlots(
  scope: Scope,
  filter?: TimetableFilter
): Promise<EnrichedTimetableSlot[]> {
  const slots = await listTimetableSlots(scope, filter);
  const [teachers, users, subjects, classes, settings] = await Promise.all([
    listTeachers(scope),
    listUsers(scope),
    listSubjects(scope),
    listClasses(scope),
    getSettings(scope),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const teacherMap = new Map(
    teachers.map((t) => [t.id, userMap.get(t.userId) || t.employeeNumber || 'Teacher'])
  );
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const classMap = new Map(classes.map((c) => [c.id, `${c.grade} - ${c.section}`]));
  const periodMap = new Map((settings.periods || []).map((p) => [p.period, p]));

  return slots.map((slot) => {
    const subject = subjectMap.get(slot.subjectId);
    const periodDef = periodMap.get(slot.period);
    return {
      ...slot,
      teacherName: teacherMap.get(slot.teacherId) || 'Unknown Teacher',
      subjectName: subject?.name || 'Unknown Subject',
      subjectCode: subject?.code,
      className: classMap.get(slot.classId) || 'Unknown Class',
      periodName: periodDef?.name || `Period ${slot.period}`,
      isBreak: periodDef?.isBreak || false,
    };
  });
}

/**
 * Upserts a timetable slot: if a slot exists for the given classId, dayOfWeek, and period,
 * updates it; otherwise creates a new slot.
 */
export async function upsertTimetableSlot(input: NewTimetableSlot): Promise<TimetableSlot> {
  const existingSlots = await listTimetableSlots(
    { schoolId: input.schoolId, campusId: input.campusId },
    { classId: input.classId, dayOfWeek: input.dayOfWeek, period: input.period }
  );

  if (existingSlots.length > 0) {
    const existing = existingSlots[0];
    let startTime = input.startTime || existing.startTime;
    let endTime = input.endTime || existing.endTime;

    if (!startTime || !endTime) {
      const settings = await getSettings({ schoolId: input.schoolId, campusId: input.campusId });
      const periodDef = (settings.periods || []).find((p) => p.period === input.period);
      if (periodDef) {
        startTime = startTime || periodDef.startTime;
        endTime = endTime || periodDef.endTime;
      }
    }

    return updateTimetableSlot(existing.id, {
      subjectId: input.subjectId,
      teacherId: input.teacherId,
      room: input.room,
      startTime,
      endTime,
    });
  }

  return createTimetableSlot(input);
}

/**
 * Removes a timetable slot matching coordinates.
 */
export async function deleteTimetableSlotByCoordinates(
  scope: Scope,
  classId: ID,
  dayOfWeek: DayOfWeek,
  period: number
): Promise<boolean> {
  const existingSlots = await listTimetableSlots(scope, { classId, dayOfWeek, period });
  if (existingSlots.length > 0) {
    for (const slot of existingSlots) {
      await deleteTimetableSlot(slot.id);
    }
    return true;
  }
  return false;
}

export interface ClassTimetableGridData {
  classId: ID;
  slots: EnrichedTimetableSlot[];
  slotMap: Record<string, EnrichedTimetableSlot>;
}

/**
 * Returns structured timetable grid data for a specific class section.
 */
export async function getClassTimetableGrid(
  scope: Scope,
  classId: ID
): Promise<ClassTimetableGridData> {
  const slots = await getEnrichedTimetableSlots(scope, { classId });
  const slotMap: Record<string, EnrichedTimetableSlot> = {};
  for (const slot of slots) {
    slotMap[`${slot.dayOfWeek}_${slot.period}`] = slot;
  }
  return {
    classId,
    slots,
    slotMap,
  };
}

export interface TeacherTimetableGridData {
  teacherId: ID;
  teacherName: string;
  department?: string;
  slots: EnrichedTimetableSlot[];
  slotMap: Record<string, EnrichedTimetableSlot>;
  metrics: {
    teachingPeriodsCount: number;
    uniqueClassesCount: number;
    uniqueSubjectsCount: number;
  };
}

/**
 * Returns structured timetable grid data for a specific teacher/faculty member.
 */
export async function getTeacherTimetableGrid(
  scope: Scope,
  teacherId: ID
): Promise<TeacherTimetableGridData> {
  const [slots, teachers, users] = await Promise.all([
    getEnrichedTimetableSlots(scope, { teacherId }),
    listTeachers(scope),
    listUsers(scope),
  ]);

  const teacher = teachers.find((t) => t.id === teacherId);
  const user = teacher ? users.find((u) => u.id === teacher.userId) : null;
  const teacherName = user?.name || teacher?.employeeNumber || 'Teacher';

  const slotMap: Record<string, EnrichedTimetableSlot> = {};
  const uniqueClassIds = new Set<string>();
  const uniqueSubjectIds = new Set<string>();

  for (const slot of slots) {
    slotMap[`${slot.dayOfWeek}_${slot.period}`] = slot;
    if (slot.classId) uniqueClassIds.add(slot.classId);
    if (slot.subjectId) uniqueSubjectIds.add(slot.subjectId);
  }

  return {
    teacherId,
    teacherName,
    department: teacher?.department,
    slots,
    slotMap,
    metrics: {
      teachingPeriodsCount: slots.length,
      uniqueClassesCount: uniqueClassIds.size,
      uniqueSubjectsCount: uniqueSubjectIds.size,
    },
  };
}

export interface RoomTimetableGridData {
  room: string;
  slots: EnrichedTimetableSlot[];
  slotMap: Record<string, EnrichedTimetableSlot>;
  metrics: {
    occupiedPeriodsCount: number;
    uniqueClassesCount: number;
    uniqueTeachersCount: number;
  };
}

/**
 * Returns structured timetable grid data for a specific classroom or facility.
 */
export async function getRoomTimetableGrid(
  scope: Scope,
  room: string
): Promise<RoomTimetableGridData> {
  const normalizedTargetRoom = room.trim().toLowerCase();
  const allEnrichedSlots = await getEnrichedTimetableSlots(scope);
  const slots = allEnrichedSlots.filter(
    (slot) => slot.room?.trim().toLowerCase() === normalizedTargetRoom
  );

  const slotMap: Record<string, EnrichedTimetableSlot> = {};
  const uniqueClassIds = new Set<string>();
  const uniqueTeacherIds = new Set<string>();

  for (const slot of slots) {
    slotMap[`${slot.dayOfWeek}_${slot.period}`] = slot;
    if (slot.classId) uniqueClassIds.add(slot.classId);
    if (slot.teacherId) uniqueTeacherIds.add(slot.teacherId);
  }

  return {
    room,
    slots,
    slotMap,
    metrics: {
      occupiedPeriodsCount: slots.length,
      uniqueClassesCount: uniqueClassIds.size,
      uniqueTeachersCount: uniqueTeacherIds.size,
    },
  };
}

/**
 * Returns a distinct sorted list of all active rooms configured across classes and scheduled timetable slots.
 */
export async function listDistinctRooms(scope: Scope): Promise<string[]> {
  const [classes, slots] = await Promise.all([
    listClasses(scope),
    listTimetableSlots(scope),
  ]);

  const roomsSet = new Set<string>();

  for (const c of classes) {
    if (c.room && c.room.trim()) {
      roomsSet.add(c.room.trim());
    }
  }

  for (const s of slots) {
    if (s.room && s.room.trim()) {
      roomsSet.add(s.room.trim());
    }
  }

  return Array.from(roomsSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export interface TimetableClash {
  type: 'teacher' | 'room';
  title: string;
  description: string;
  conflictingSlot: EnrichedTimetableSlot;
  conflictingClassLabel: string;
  conflictingCampusName?: string;
}

export interface ClashCheckParams {
  schoolId: ID;
  campusId?: ID;
  classId: ID;
  dayOfWeek: DayOfWeek;
  period: number;
  teacherId?: ID;
  room?: string;
  excludeSlotId?: ID;
}

export interface ClashCheckResult {
  hasClash: boolean;
  clashes: TimetableClash[];
  teacherClash?: TimetableClash;
  roomClash?: TimetableClash;
}

/**
 * Detects live timetable clashes for a proposed teacher or room assignment.
 * - Teacher clash: checks across the entire school network (all campuses) during the same day and period.
 * - Room clash: checks across classes within the same campus during the same day and period.
 * - Self-exclusion: excludes the current slot being edited if excludeSlotId is provided.
 */
export async function detectTimetableClashes(
  params: ClashCheckParams
): Promise<ClashCheckResult> {
  const clashes: TimetableClash[] = [];
  let teacherClash: TimetableClash | undefined;
  let roomClash: TimetableClash | undefined;

  // 1. Fetch all slots across the entire school network for this day and period
  const schoolScope: Scope = { schoolId: params.schoolId };
  const allSlots = await listTimetableSlots(schoolScope, {
    dayOfWeek: params.dayOfWeek,
    period: params.period,
  });

  // Filter out the slot currently being edited
  const relevantSlots = allSlots.filter((slot) => {
    if (params.excludeSlotId && slot.id === params.excludeSlotId) {
      return false;
    }
    return true;
  });

  if (relevantSlots.length === 0) {
    return { hasClash: false, clashes: [] };
  }

  // Pre-fetch reference entities for human-readable labels
  const [teachers, users, subjects, classes, campuses, settings] = await Promise.all([
    listTeachers(schoolScope),
    listUsers(schoolScope),
    listSubjects(schoolScope),
    listClasses(schoolScope),
    listCampuses(schoolScope),
    getSettings(schoolScope),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const teacherMap = new Map(
    teachers.map((t) => [t.id, userMap.get(t.userId) || t.employeeNumber || 'Teacher'])
  );
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const classMap = new Map(classes.map((c) => [c.id, `${c.grade} - ${c.section}`]));
  const campusMap = new Map(campuses.map((cp) => [cp.id, cp.name]));
  const periodMap = new Map((settings.periods || []).map((p) => [p.period, p]));

  function enrich(slot: TimetableSlot): EnrichedTimetableSlot {
    const subject = subjectMap.get(slot.subjectId);
    const periodDef = periodMap.get(slot.period);
    return {
      ...slot,
      teacherName: teacherMap.get(slot.teacherId) || 'Unknown Teacher',
      subjectName: subject?.name || 'Unknown Subject',
      subjectCode: subject?.code,
      className: classMap.get(slot.classId) || 'Unknown Class',
      periodName: periodDef?.name || `Period ${slot.period}`,
      isBreak: periodDef?.isBreak || false,
    };
  }

  // Check 1: Teacher clash (across ALL campuses)
  if (params.teacherId) {
    const conflictingTeacherSlot = relevantSlots.find(
      (slot) => slot.teacherId === params.teacherId
    );

    if (conflictingTeacherSlot) {
      const enriched = enrich(conflictingTeacherSlot);
      const confClassLabel = classMap.get(conflictingTeacherSlot.classId) || 'another class';
      const confCampusName = conflictingTeacherSlot.campusId
        ? campusMap.get(conflictingTeacherSlot.campusId)
        : undefined;

      const campusSuffix =
        confCampusName && conflictingTeacherSlot.campusId !== params.campusId
          ? ` at ${confCampusName}`
          : '';

      const teacherName = teacherMap.get(params.teacherId) || 'Selected teacher';

      teacherClash = {
        type: 'teacher',
        title: 'Teacher Schedule Conflict',
        description: `${teacherName} is already scheduled with ${confClassLabel}${campusSuffix} during Period ${params.period} (${enriched.subjectName}).`,
        conflictingSlot: enriched,
        conflictingClassLabel: confClassLabel,
        conflictingCampusName: confCampusName,
      };
      clashes.push(teacherClash);
    }
  }

  // Check 2: Room clash (within the same campus)
  if (params.room && params.room.trim().length > 0) {
    const normalizedRoom = params.room.trim().toLowerCase();
    const conflictingRoomSlot = relevantSlots.find((slot) => {
      if (params.campusId && slot.campusId && slot.campusId !== params.campusId) {
        return false;
      }
      return slot.room?.trim().toLowerCase() === normalizedRoom;
    });

    if (conflictingRoomSlot) {
      const enriched = enrich(conflictingRoomSlot);
      const confClassLabel = classMap.get(conflictingRoomSlot.classId) || 'another class';
      const confCampusName = conflictingRoomSlot.campusId
        ? campusMap.get(conflictingRoomSlot.campusId)
        : undefined;

      roomClash = {
        type: 'room',
        title: 'Room Occupancy Conflict',
        description: `Room "${params.room.trim()}" is already occupied by ${confClassLabel} during Period ${params.period} (${enriched.subjectName}).`,
        conflictingSlot: enriched,
        conflictingClassLabel: confClassLabel,
        conflictingCampusName: confCampusName,
      };
      clashes.push(roomClash);
    }
  }

  return {
    hasClash: clashes.length > 0,
    clashes,
    teacherClash,
    roomClash,
  };
}


