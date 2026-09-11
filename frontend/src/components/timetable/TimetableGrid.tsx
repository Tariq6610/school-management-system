'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Class, Subject, PeriodDefinition, DayOfWeek, Scope, EnrichedTimetableSlot } from '@/types';
import { listClasses } from '@/lib/repositories/classes';
import { listSubjects } from '@/lib/repositories/subjects';
import { listTeachers } from '@/lib/repositories/teachers';
import { listUsers } from '@/lib/repositories/users';
import { getPeriodConfiguration } from '@/lib/repositories/settings';
import {
  getClassTimetableGrid,
  upsertTimetableSlot,
  deleteTimetableSlot,
} from '@/lib/repositories/timetableSlots';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { SlotPickerModal, TeacherOption } from './SlotPickerModal';

const DAY_NAMES: Record<DayOfWeek, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

export interface TimetableGridProps {
  initialClasses?: Class[];
  initialPeriods?: PeriodDefinition[];
  initialTeachers?: TeacherOption[];
  initialSlotMap?: Record<string, EnrichedTimetableSlot>;
}

export function TimetableGrid({
  initialClasses,
  initialPeriods,
  initialTeachers,
  initialSlotMap,
}: TimetableGridProps) {
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';
  const campusId = session?.campusId;

  const [classes, setClasses] = useState<Class[]>(initialClasses || []);
  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialClasses && initialClasses.length > 0 ? initialClasses[0].id : ''
  );
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>(initialTeachers || []);
  const [periods, setPeriods] = useState<PeriodDefinition[]>(initialPeriods || []);
  const [slotMap, setSlotMap] = useState<Record<string, EnrichedTimetableSlot>>(
    initialSlotMap || {}
  );
  const [loading, setLoading] = useState<boolean>(!initialClasses);
  const [includeSaturday, setIncludeSaturday] = useState<boolean>(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [activeCell, setActiveCell] = useState<{
    dayOfWeek: DayOfWeek;
    period: number;
    periodName: string;
    periodTime: string;
  } | null>(null);
  const [activeSlot, setActiveSlot] = useState<EnrichedTimetableSlot | null>(null);

  // Initial load of classes, periods, and teachers
  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        setLoading(true);
        const scope: Scope = { schoolId, campusId };
        const [clsList, periodList, tchList, usrList] = await Promise.all([
          listClasses(scope),
          getPeriodConfiguration(scope),
          listTeachers(scope),
          listUsers(scope),
        ]);

        if (!ignore) {
          setClasses(clsList);
          setPeriods(periodList);

          const userMap = new Map(usrList.map((u) => [u.id, u.name]));
          const teacherOpts: TeacherOption[] = tchList.map((t) => ({
            id: t.id,
            name: userMap.get(t.userId) || t.employeeNumber || 'Teacher',
            employeeNumber: t.employeeNumber,
            department: t.department,
          }));
          setTeachers(teacherOpts);

          if (clsList.length > 0) {
            setSelectedClassId(clsList[0].id);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to initialize timetable builder:', err);
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

  // Load subjects and timetable slots whenever selected class changes
  const loadClassSchedule = useCallback(async () => {
    if (!selectedClassId) return;
    try {
      const scope: Scope = { schoolId, campusId };
      const [allSubjects, gridData] = await Promise.all([
        listSubjects(scope),
        getClassTimetableGrid(scope, selectedClassId),
      ]);

      const classSubjects = allSubjects.filter((s) => s.classId === selectedClassId);
      setSubjects(classSubjects);
      setSlotMap(gridData.slotMap);
    } catch (err) {
      console.error('Failed to load class schedule grid:', err);
    }
  }, [schoolId, campusId, selectedClassId]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) {
        loadClassSchedule();
      }
    });
    return () => {
      ignore = true;
    };
  }, [loadClassSchedule]);

  const selectedClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId);
  }, [classes, selectedClassId]);

  const activeDays: DayOfWeek[] = useMemo(() => {
    return includeSaturday ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
  }, [includeSaturday]);

  const instructionalPeriods = useMemo(() => {
    return periods.filter((p) => !p.isBreak);
  }, [periods]);

  const stats = useMemo(() => {
    const totalPotentialSlots = instructionalPeriods.length * activeDays.length;
    let scheduledCount = 0;

    for (const day of activeDays) {
      for (const p of instructionalPeriods) {
        if (slotMap[`${day}_${p.period}`]) {
          scheduledCount++;
        }
      }
    }

    const percentage =
      totalPotentialSlots > 0 ? Math.round((scheduledCount / totalPotentialSlots) * 100) : 0;

    return {
      totalPotentialSlots,
      scheduledCount,
      percentage,
    };
  }, [instructionalPeriods, activeDays, slotMap]);

  // Cell click handler
  const handleCellClick = (period: PeriodDefinition, day: DayOfWeek) => {
    if (period.isBreak) return;

    const existingSlot = slotMap[`${day}_${period.period}`] || null;
    setActiveCell({
      dayOfWeek: day,
      period: period.period,
      periodName: period.name,
      periodTime: `${period.startTime} - ${period.endTime}`,
    });
    setActiveSlot(existingSlot);
    setModalOpen(true);
  };

  // Save slot handler
  const handleSaveSlot = async (payload: { subjectId: string; teacherId: string; room?: string }) => {
    if (!activeCell || !selectedClass) return;

    await upsertTimetableSlot({
      schoolId: selectedClass.schoolId,
      campusId: selectedClass.campusId,
      classId: selectedClass.id,
      subjectId: payload.subjectId,
      teacherId: payload.teacherId,
      dayOfWeek: activeCell.dayOfWeek,
      period: activeCell.period,
      room: payload.room,
    });

    await loadClassSchedule();
    showToast({
      type: 'success',
      title: 'Slot Scheduled',
      message: `${DAY_NAMES[activeCell.dayOfWeek]} ${activeCell.periodName} updated.`,
    });
  };

  // Delete slot handler
  const handleDeleteSlot = async () => {
    if (!activeSlot) return;

    await deleteTimetableSlot(activeSlot.id);
    await loadClassSchedule();
    showToast({
      type: 'info',
      title: 'Slot Cleared',
      message: 'Timetable slot removed successfully.',
    });
  };

  if (loading) {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center text-neutral-500 motion-safe:animate-pulse">
        Loading timetable builder grid...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Class Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label htmlFor="class-selector" className="text-sm font-bold text-neutral-800 shrink-0">
            Select Class:
          </label>
          <select
            id="class-selector"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="text-sm font-semibold border border-neutral-300 rounded-lg px-3.5 py-2 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[220px]"
          >
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.grade} - Section {cls.section} ({cls.room ? `Room ${cls.room}` : 'No Room'})
              </option>
            ))}
          </select>

          {selectedClass && (
            <span className="text-xs text-neutral-500">
              Capacity: {selectedClass.capacity} students
            </span>
          )}
        </div>

        {/* Schedule Stats & Day Toggle */}
        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-neutral-700">
            <input
              type="checkbox"
              checked={includeSaturday}
              onChange={(e) => setIncludeSaturday(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 border-neutral-300"
            />
            Include Saturday
          </label>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-neutral-200">
            <div className="text-right">
              <span className="text-xs font-semibold text-neutral-700">
                {stats.scheduledCount} / {stats.totalPotentialSlots} Slots
              </span>
              <span className="block text-[10px] text-neutral-500">
                {stats.percentage}% Filled
              </span>
            </div>
            <div className="w-16 bg-neutral-100 rounded-full h-2 overflow-hidden border border-neutral-200">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Timetable Matrix Grid */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left min-w-[760px]">
            {/* Table Header: Days of the Week */}
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-700">
                <th className="py-3 px-4 w-40 text-xs font-bold uppercase tracking-wider text-neutral-500 border-r border-neutral-200">
                  Period / Time
                </th>
                {activeDays.map((day) => (
                  <th
                    key={day}
                    className="py-3 px-3 text-sm font-bold text-neutral-800 text-center border-r last:border-r-0 border-neutral-200"
                  >
                    {DAY_NAMES[day]}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body: Period Rows */}
            <tbody className="divide-y divide-neutral-200">
              {periods.map((period) => {
                // Render Break Row
                if (period.isBreak) {
                  return (
                    <tr key={`period-${period.period}`} className="bg-amber-50/60">
                      <td className="py-2.5 px-4 text-xs font-semibold text-amber-900 border-r border-neutral-200 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span>{period.name}</span>
                        </div>
                        <span className="text-[11px] text-amber-700 font-mono">
                          {period.startTime} - {period.endTime}
                        </span>
                      </td>
                      <td
                        colSpan={activeDays.length}
                        className="py-2 px-4 text-center text-xs font-semibold text-amber-800 uppercase tracking-widest bg-amber-50/70 select-none"
                      >
                        ☕ {period.name} ({period.startTime} – {period.endTime}) — Non-Instructional Break
                      </td>
                    </tr>
                  );
                }

                // Render Instructional Period Row
                return (
                  <tr key={`period-${period.period}`} className="hover:bg-neutral-50/40 transition-colors">
                    {/* Period Label Column */}
                    <td className="py-3 px-4 border-r border-neutral-200 align-top bg-neutral-50/50">
                      <div className="text-xs font-bold text-neutral-900">{period.name}</div>
                      <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                        {period.startTime} – {period.endTime}
                      </div>
                      <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-neutral-200/70 text-neutral-700 font-medium">
                        Period {period.period}
                      </span>
                    </td>

                    {/* Day Cells */}
                    {activeDays.map((day) => {
                      const slotKey = `${day}_${period.period}`;
                      const slot = slotMap[slotKey];

                      return (
                        <td
                          key={slotKey}
                          onClick={() => handleCellClick(period, day)}
                          className={`py-2 px-2.5 border-r last:border-r-0 border-neutral-200 align-top h-24 cursor-pointer transition-all duration-150 group ${
                            slot
                              ? 'bg-purple-50/30 hover:bg-purple-50/70 hover:shadow-xs'
                              : 'hover:bg-purple-50/20'
                          }`}
                        >
                          {slot ? (
                            <div className="h-full flex flex-col justify-between p-2 rounded-lg bg-white border border-purple-200/80 shadow-2xs group-hover:border-purple-300">
                              <div>
                                <div className="flex items-start justify-between gap-1">
                                  <span className="text-xs font-bold text-neutral-900 leading-snug line-clamp-1">
                                    {slot.subjectName}
                                  </span>
                                  {slot.subjectCode && (
                                    <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-purple-100 text-purple-800 font-medium shrink-0">
                                      {slot.subjectCode}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-neutral-600 flex items-center gap-1 mt-1 truncate">
                                  <svg
                                    className="w-3 h-3 text-neutral-500 shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                    />
                                  </svg>
                                  <span className="truncate">{slot.teacherName}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between mt-2 pt-1 border-t border-neutral-100 text-[10px]">
                                <span className="text-neutral-500 font-medium truncate">
                                  {slot.room || selectedClass?.room || 'Room TBD'}
                                </span>
                                <span className="text-purple-700 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                                  Edit ✎
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center rounded-lg border border-dashed border-neutral-200 group-hover:border-purple-300 group-hover:bg-purple-50/20 text-neutral-500 group-hover:text-purple-600 transition-colors">
                              <span className="text-xs font-medium flex items-center gap-1">
                                <span className="text-sm leading-none">+</span> Assign
                              </span>
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
      </div>

      {/* Slot Picker Modal */}
      {activeCell && (
        <SlotPickerModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setActiveCell(null);
            setActiveSlot(null);
          }}
          dayName={DAY_NAMES[activeCell.dayOfWeek]}
          periodName={activeCell.periodName}
          periodTime={activeCell.periodTime}
          classNameLabel={
            selectedClass ? `${selectedClass.grade} - ${selectedClass.section}` : 'Class'
          }
          subjects={subjects}
          teachers={teachers}
          currentSlot={activeSlot}
          defaultRoom={selectedClass?.room}
          schoolId={schoolId}
          campusId={campusId}
          classId={selectedClassId}
          dayOfWeek={activeCell.dayOfWeek}
          period={activeCell.period}
          onSave={handleSaveSlot}
          onDelete={activeSlot ? handleDeleteSlot : undefined}
        />
      )}
    </div>
  );
}
