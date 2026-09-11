'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DayOfWeek,
  EnrichedTimetableSlot,
  PeriodDefinition,
  Class,
  Scope,
} from '@/types';
import { useSession } from '@/components/providers/SessionProvider';
import {
  getClassTimetableGrid,
  getTeacherTimetableGrid,
  getRoomTimetableGrid,
  listDistinctRooms,
  TeacherTimetableGridData,
  RoomTimetableGridData,
} from '@/lib/repositories/timetableSlots';
import { listClasses } from '@/lib/repositories/classes';
import { listTeachers } from '@/lib/repositories/teachers';
import { listUsers } from '@/lib/repositories/users';
import { getSettings } from '@/lib/repositories/settings';
import { getSchool } from '@/lib/repositories/schools';
import { getCampus } from '@/lib/repositories/campuses';
import { Button } from '@/components/ui/Button';

export type TimetableViewMode = 'class' | 'teacher' | 'room';

interface TeacherItem {
  id: string;
  name: string;
  department?: string;
  employeeNumber?: string;
}

const DAY_NAMES: Record<DayOfWeek, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

export interface TimetableScheduleViewsProps {
  initialClasses?: Class[];
  initialTeachers?: TeacherItem[];
  initialRooms?: string[];
  initialPeriods?: PeriodDefinition[];
  initialViewMode?: TimetableViewMode;
}

export function TimetableScheduleViews({
  initialClasses,
  initialTeachers,
  initialRooms,
  initialPeriods,
  initialViewMode = 'class',
}: TimetableScheduleViewsProps) {
  const { session } = useSession();
  const schoolId = session?.schoolId ?? 'sch_main';
  const campusId = session?.campusId;

  // View state
  const [viewMode, setViewMode] = useState<TimetableViewMode>(initialViewMode);
  const [includeSaturday, setIncludeSaturday] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(!initialClasses);

  // Reference collections
  const [classes, setClasses] = useState<Class[]>(initialClasses || []);
  const [teachers, setTeachers] = useState<TeacherItem[]>(initialTeachers || []);
  const [rooms, setRooms] = useState<string[]>(initialRooms || []);
  const [periods, setPeriods] = useState<PeriodDefinition[]>(initialPeriods || []);
  const [schoolName, setSchoolName] = useState<string>('School Management System');
  const [campusName, setCampusName] = useState<string>('Main Campus');

  // Active selection
  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialClasses && initialClasses.length > 0 ? initialClasses[0].id : ''
  );
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    initialTeachers && initialTeachers.length > 0 ? initialTeachers[0].id : ''
  );
  const [selectedRoom, setSelectedRoom] = useState<string>(
    initialRooms && initialRooms.length > 0 ? initialRooms[0] : ''
  );

  // Active grid data
  const [classSlots, setClassSlots] = useState<Record<string, EnrichedTimetableSlot>>({});
  const [teacherData, setTeacherData] = useState<TeacherTimetableGridData | null>(null);
  const [roomData, setRoomData] = useState<RoomTimetableGridData | null>(null);

  // Initial load
  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        setLoading(true);
        const scope: Scope = { schoolId, campusId };
        const [
          classList,
          teacherList,
          userList,
          roomList,
          settings,
          school,
          campus,
        ] = await Promise.all([
          listClasses(scope),
          listTeachers(scope),
          listUsers(scope),
          listDistinctRooms(scope),
          getSettings(scope),
          getSchool(schoolId),
          campusId ? getCampus(campusId) : Promise.resolve(null),
        ]);

        if (ignore) return;

        setClasses(classList);
        if (classList.length > 0) {
          setSelectedClassId(classList[0].id);
        }

        const userMap = new Map(userList.map((u) => [u.id, u.name]));
        const teacherOptions: TeacherItem[] = teacherList.map((t) => ({
          id: t.id,
          name: userMap.get(t.userId) || t.employeeNumber || 'Teacher',
          department: t.department,
          employeeNumber: t.employeeNumber,
        }));
        setTeachers(teacherOptions);
        if (teacherOptions.length > 0) {
          setSelectedTeacherId(teacherOptions[0].id);
        }

        setRooms(roomList);
        if (roomList.length > 0) {
          setSelectedRoom(roomList[0]);
        }

        if (settings.periods && settings.periods.length > 0) {
          setPeriods(settings.periods);
        }

        if (school?.name) setSchoolName(school.name);
        if (campus?.name) setCampusName(campus.name);

        setLoading(false);
      } catch (err) {
        if (!ignore) {
          console.error('Failed to initialize timetable schedule views:', err);
          setLoading(false);
        }
      }
    }

    Promise.resolve().then(() => {
      if (!ignore) {
        init();
      }
    });

    return () => {
      ignore = true;
    };
  }, [schoolId, campusId]);

  // Load grid when active selection changes
  const loadScheduleGrid = useCallback(async () => {
    const scope: Scope = { schoolId, campusId };
    try {
      if (viewMode === 'class' && selectedClassId) {
        const grid = await getClassTimetableGrid(scope, selectedClassId);
        setClassSlots(grid.slotMap);
      } else if (viewMode === 'teacher' && selectedTeacherId) {
        const data = await getTeacherTimetableGrid(scope, selectedTeacherId);
        setTeacherData(data);
      } else if (viewMode === 'room' && selectedRoom) {
        const data = await getRoomTimetableGrid(scope, selectedRoom);
        setRoomData(data);
      }
    } catch (err) {
      console.error('Failed to load schedule matrix:', err);
    }
  }, [schoolId, campusId, viewMode, selectedClassId, selectedTeacherId, selectedRoom]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) {
        loadScheduleGrid();
      }
    });
    return () => {
      ignore = true;
    };
  }, [loadScheduleGrid]);

  const activeDays: DayOfWeek[] = useMemo(() => {
    return includeSaturday ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
  }, [includeSaturday]);

  const instructionalPeriods = useMemo(() => {
    return periods.filter((p) => !p.isBreak);
  }, [periods]);

  // Active target label
  const activeTitle = useMemo(() => {
    if (viewMode === 'class') {
      const cls = classes.find((c) => c.id === selectedClassId);
      return cls ? `Class Timetable: ${cls.grade} - Section ${cls.section}` : 'Class Timetable';
    }
    if (viewMode === 'teacher') {
      const tch = teachers.find((t) => t.id === selectedTeacherId);
      return tch ? `Faculty Schedule: ${tch.name} ${tch.department ? `(${tch.department})` : ''}` : 'Faculty Timetable';
    }
    return selectedRoom ? `Room Allocation: ${selectedRoom}` : 'Room Timetable';
  }, [viewMode, selectedClassId, selectedTeacherId, selectedRoom, classes, teachers]);

  // Active subtitle
  const activeSubtitle = useMemo(() => {
    if (viewMode === 'class') {
      const cls = classes.find((c) => c.id === selectedClassId);
      return cls?.room ? `Home Classroom: ${cls.room}` : 'Academic Schedule';
    }
    if (viewMode === 'teacher') {
      const tch = teachers.find((t) => t.id === selectedTeacherId);
      return tch?.employeeNumber ? `Employee ID: ${tch.employeeNumber}` : 'Teaching Schedule';
    }
    return 'Facility Usage Schedule';
  }, [viewMode, selectedClassId, selectedTeacherId, classes, teachers]);

  // Active slot lookup
  const getSlotForCell = (day: DayOfWeek, periodNum: number): EnrichedTimetableSlot | undefined => {
    const key = `${day}_${periodNum}`;
    if (viewMode === 'class') {
      return classSlots[key];
    }
    if (viewMode === 'teacher') {
      return teacherData?.slotMap[key];
    }
    return roomData?.slotMap[key];
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center text-neutral-500 shadow-xs motion-safe:animate-pulse">
        Loading timetable schedules...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Switcher & Actions Bar (Screen only) */}
      <div className="no-print bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Mode Switcher */}
          <div className="inline-flex rounded-xl bg-neutral-100 p-1">
            <button
              type="button"
              onClick={() => setViewMode('class')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'class'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              🏫 By Class
            </button>
            <button
              type="button"
              onClick={() => setViewMode('teacher')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'teacher'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              👨‍🏫 By Teacher
            </button>
            <button
              type="button"
              onClick={() => setViewMode('room')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'room'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              🚪 By Room
            </button>
          </div>

          {/* Right Action: Saturday Toggle & Print */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeSaturday}
                onChange={(e) => setIncludeSaturday(e.target.checked)}
                className="rounded border-neutral-300 text-purple-600 focus:ring-purple-500"
              />
              <span>Include Saturday (6-Day)</span>
            </label>

            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="flex items-center gap-1.5 shadow-xs"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              <span>Print Timetable</span>
            </Button>
          </div>
        </div>

        {/* Dynamic Selector Dropdown */}
        <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center gap-4">
          {viewMode === 'class' && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="class-view-select"
                className="text-xs font-bold text-neutral-600 uppercase tracking-wider"
              >
                Select Class Cohort:
              </label>
              <select
                id="class-view-select"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="text-sm font-semibold border border-neutral-300 rounded-lg py-1.5 px-3 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.grade} - Section {c.section} {c.room ? `(${c.room})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {viewMode === 'teacher' && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="teacher-view-select"
                className="text-xs font-bold text-neutral-600 uppercase tracking-wider"
              >
                Select Faculty Member:
              </label>
              <select
                id="teacher-view-select"
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="text-sm font-semibold border border-neutral-300 rounded-lg py-1.5 px-3 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.department ? `(${t.department})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {viewMode === 'room' && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="room-view-select"
                className="text-xs font-bold text-neutral-600 uppercase tracking-wider"
              >
                Select Facility / Room:
              </label>
              {rooms.length > 0 ? (
                <select
                  id="room-view-select"
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="text-sm font-semibold border border-neutral-300 rounded-lg py-1.5 px-3 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {rooms.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs text-amber-600">
                  No rooms registered yet. Assign rooms to classes or slots.
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Printable Schedule Container */}
      <div className="bg-white border border-neutral-200 print:border-none rounded-2xl p-6 sm:p-8 shadow-xs print:shadow-none space-y-6">
        {/* Printable Document Institutional Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-200 print:border-black gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-widest text-purple-700 print:text-black">
                {schoolName} &bull; {campusName}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 print:text-black mt-1">
              {activeTitle}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 print:text-neutral-700 mt-0.5">
              {activeSubtitle} &bull; Weekly Academic Schedule
            </p>
          </div>

          <div className="text-left sm:text-right text-xs text-neutral-500 print:text-neutral-800">
            <p className="font-semibold text-neutral-900 print:text-black">Official Schedule</p>
            <p>Generated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            <p className="text-[11px] text-neutral-500 print:text-neutral-600">Confidential &bull; School Internal Use</p>
          </div>
        </div>

        {/* Schedule Matrix Table */}
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full border-collapse text-left text-xs min-w-[750px] print:min-w-full">
            <thead>
              <tr className="bg-neutral-50 print:bg-neutral-100 border-y border-neutral-200 print:border-black">
                <th className="p-3 font-bold text-neutral-700 print:text-black uppercase tracking-wider text-[11px] w-28 text-center border-r border-neutral-200 print:border-black">
                  Period / Time
                </th>
                {activeDays.map((day) => (
                  <th
                    key={day}
                    className="p-3 font-bold text-neutral-900 print:text-black uppercase tracking-wider text-[11px] border-r border-neutral-200 print:border-black last:border-r-0 text-center"
                  >
                    {DAY_NAMES[day]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 print:divide-black">
              {periods.map((periodDef) => {
                if (periodDef.isBreak) {
                  return (
                    <tr
                      key={`break_${periodDef.period}`}
                      className="bg-amber-50/70 print:bg-neutral-100 border-y border-amber-200/80 print:border-black"
                    >
                      <td className="p-2.5 text-center font-bold text-amber-900 print:text-black border-r border-amber-200/80 print:border-black">
                        <div className="text-[11px] uppercase tracking-wider">
                          {periodDef.name}
                        </div>
                        <div className="text-[10px] text-amber-700 print:text-neutral-700 font-mono">
                          {periodDef.startTime} - {periodDef.endTime}
                        </div>
                      </td>
                      <td
                        colSpan={activeDays.length}
                        className="p-2.5 text-center font-semibold text-xs text-amber-800 print:text-black tracking-wider uppercase"
                      >
                        ☕ {periodDef.name} ({periodDef.startTime} – {periodDef.endTime}) &bull; Non-Instructional Break
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={`period_${periodDef.period}`} className="hover:bg-neutral-50/40 print:hover:bg-transparent">
                    {/* Period Label Column */}
                    <td className="p-3 text-center border-r border-neutral-200 print:border-black bg-neutral-50/40 print:bg-transparent font-medium">
                      <div className="font-bold text-neutral-900 print:text-black text-xs">
                        {periodDef.name}
                      </div>
                      <div className="text-[10px] font-mono text-neutral-500 print:text-neutral-800 mt-0.5">
                        {periodDef.startTime} - {periodDef.endTime}
                      </div>
                    </td>

                    {/* Day Cells */}
                    {activeDays.map((day) => {
                      const slot = getSlotForCell(day, periodDef.period);

                      return (
                        <td
                          key={`${day}_${periodDef.period}`}
                          className="p-2.5 border-r border-neutral-200 print:border-black last:border-r-0 align-top h-20 w-[14%]"
                        >
                          {slot ? (
                            <div className="h-full flex flex-col justify-between rounded-lg border border-purple-200 print:border-black bg-purple-50/40 print:bg-transparent p-2">
                              <div>
                                {viewMode === 'class' ? (
                                  <>
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                      <span className="font-bold text-purple-950 print:text-black text-xs leading-tight truncate">
                                        {slot.subjectName}
                                      </span>
                                      {slot.subjectCode && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 print:border print:border-black text-purple-800 print:text-black uppercase">
                                          {slot.subjectCode}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-neutral-700 print:text-black flex items-center gap-1">
                                      <span>👨‍🏫 {slot.teacherName}</span>
                                    </div>
                                  </>
                                ) : viewMode === 'teacher' ? (
                                  <>
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                      <span className="font-bold text-purple-950 print:text-black text-xs leading-tight truncate">
                                        {slot.className}
                                      </span>
                                      {slot.subjectCode && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 print:border print:border-black text-purple-800 print:text-black uppercase">
                                          {slot.subjectCode}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-neutral-700 print:text-black">
                                      <span>📖 {slot.subjectName}</span>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                      <span className="font-bold text-purple-950 print:text-black text-xs leading-tight truncate">
                                        {slot.className}
                                      </span>
                                      {slot.subjectCode && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 print:border print:border-black text-purple-800 print:text-black uppercase">
                                          {slot.subjectCode}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-neutral-700 print:text-black">
                                      <span>👨‍🏫 {slot.teacherName}</span>
                                    </div>
                                  </>
                                )}
                              </div>

                              <div className="mt-2 pt-1 border-t border-purple-100 print:border-neutral-300 flex items-center justify-between text-[10px] text-neutral-500 print:text-neutral-800">
                                <span className="font-medium truncate">
                                  📍 {slot.room || 'Room TBD'}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center rounded-lg border border-dashed border-neutral-200 print:border-neutral-300 text-neutral-500 print:text-neutral-500 text-[10px] italic">
                              {viewMode === 'teacher' ? 'Prep / Free' : viewMode === 'room' ? 'Vacant' : '—'}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Printable Footer / Signatures */}
        <div className="pt-6 border-t border-neutral-200 print:border-black flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-neutral-500 print:text-neutral-800">
          <div>
            <p>Total Instructional Periods: <strong>{instructionalPeriods.length} daily</strong></p>
            <p>Academic Cycle: <strong>{activeDays.length} Days / Week</strong></p>
          </div>

          <div className="flex items-center gap-8 pt-4 sm:pt-0">
            <div className="text-center">
              <div className="w-32 border-b border-neutral-300 print:border-black mb-1" />
              <p className="text-[10px] uppercase font-bold text-neutral-600 print:text-black">Timetable Coordinator</p>
            </div>
            <div className="text-center">
              <div className="w-32 border-b border-neutral-300 print:border-black mb-1" />
              <p className="text-[10px] uppercase font-bold text-neutral-600 print:text-black">Principal / Headmaster</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
