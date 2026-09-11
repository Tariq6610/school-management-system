'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { EnrichedCourse, Class, Subject, Scope } from '@/types';
import { useSession } from '@/components/providers/SessionProvider';
import {
  getEnrichedCourses,
  createCourse,
  updateCourse,
  deleteCourse,
} from '@/lib/repositories/courses';
import { listClasses } from '@/lib/repositories/classes';
import { listSubjects } from '@/lib/repositories/subjects';
import { listTeachers } from '@/lib/repositories/teachers';
import { listUsers } from '@/lib/repositories/users';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

const PRESET_COVER_COLORS = [
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Purple', value: '#8b5cf6' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Slate', value: '#475569' },
];

export interface TeacherOption {
  id: string;
  name: string;
  department?: string;
}

export interface TeacherCoursesViewProps {
  initialCourses?: EnrichedCourse[];
  initialClasses?: Class[];
  initialSubjects?: Subject[];
  initialTeachers?: TeacherOption[];
}

export function TeacherCoursesView({
  initialCourses,
  initialClasses,
  initialSubjects,
  initialTeachers,
}: TeacherCoursesViewProps) {
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';
  const campusId = session?.campusId;

  const [courses, setCourses] = useState<EnrichedCourse[]>(initialCourses || []);
  const [classes, setClasses] = useState<Class[]>(initialClasses || []);
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects || []);
  const [teachers, setTeachers] = useState<TeacherOption[]>(initialTeachers || []);
  const [loading, setLoading] = useState<boolean>(!initialCourses);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<EnrichedCourse | null>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    classId: '',
    subjectId: '',
    teacherId: '',
    coverColor: '#6366f1',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const scope: Scope = { schoolId, campusId };
      const [allCourses, allCls, allSub, allTch, allUsr] = await Promise.all([
        getEnrichedCourses(scope),
        listClasses(scope),
        listSubjects(scope),
        listTeachers(scope),
        listUsers(scope),
      ]);

      const userMap = new Map(allUsr.map((u) => [u.id, u.name]));
      const teacherOptions: TeacherOption[] = allTch.map((t) => ({
        id: t.id,
        name: userMap.get(t.userId) || t.employeeNumber || 'Teacher',
        department: t.department,
      }));

      setCourses(allCourses);
      setClasses(allCls);
      setSubjects(allSub);
      setTeachers(teacherOptions);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load courses:', err);
      setLoading(false);
    }
  }, [schoolId, campusId]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore && !initialCourses) {
        loadData();
      }
    });
    return () => {
      ignore = true;
    };
  }, [loadData, initialCourses]);

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      if (selectedClassFilter && c.classId !== selectedClassFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = c.title.toLowerCase().includes(q);
        const matchSubject = c.subjectName.toLowerCase().includes(q);
        const matchTeacher = c.teacherName.toLowerCase().includes(q);
        if (!matchTitle && !matchSubject && !matchTeacher) return false;
      }
      return true;
    });
  }, [courses, selectedClassFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalCourses = courses.length;
    const uniqueClassIds = new Set(courses.map((c) => c.classId));
    const totalLessons = courses.reduce((sum, c) => sum + c.lessonCount, 0);

    return {
      totalCourses,
      classesReached: uniqueClassIds.size,
      totalLessons,
    };
  }, [courses]);

  // Reset or initialize form
  const openCreateModal = () => {
    const defaultTeacherId =
      session?.role === 'teacher' && session?.userId
        ? teachers.find((t) => t.id === session.userId)?.id || teachers[0]?.id || ''
        : teachers[0]?.id || '';

    setFormData({
      title: '',
      description: '',
      classId: classes[0]?.id || '',
      subjectId: '',
      teacherId: defaultTeacherId,
      coverColor: '#6366f1',
    });
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (course: EnrichedCourse) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description,
      classId: course.classId,
      subjectId: course.subjectId,
      teacherId: course.teacherId,
      coverColor: course.coverColor,
    });
    setFormError(null);
  };

  // When class changes in form, preselect first subject for that class if available
  const handleClassChange = (newClassId: string) => {
    const availableSubjects = subjects.filter((s) => s.classId === newClassId);
    setFormData((prev) => ({
      ...prev,
      classId: newClassId,
      subjectId: availableSubjects[0]?.id || '',
    }));
  };

  // Save handler (Create or Update)
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError('Course title is required');
      return;
    }
    if (!formData.classId) {
      setFormError('Please assign a class section');
      return;
    }
    if (!formData.subjectId) {
      setFormError('Please select an academic subject');
      return;
    }
    if (!formData.teacherId) {
      setFormError('Please select an instructor');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      if (editingCourse) {
        await updateCourse(editingCourse.id, {
          title: formData.title.trim(),
          description: formData.description.trim(),
          classId: formData.classId,
          subjectId: formData.subjectId,
          teacherId: formData.teacherId,
          coverColor: formData.coverColor,
        });
        showToast({ type: 'success', title: 'Course updated successfully' });
        setEditingCourse(null);
      } else {
        await createCourse({
          schoolId,
          campusId: campusId || 'cmp_main',
          title: formData.title.trim(),
          description: formData.description.trim(),
          classId: formData.classId,
          subjectId: formData.subjectId,
          teacherId: formData.teacherId,
          coverColor: formData.coverColor,
        });
        showToast({
          type: 'success',
          title: 'Course created',
          message: 'Students in this class are enrolled automatically.',
        });
        setIsCreateModalOpen(false);
      }

      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save course');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete handler
  const handleDeleteCourse = async (courseId: string) => {
    try {
      await deleteCourse(courseId);
      showToast({ type: 'success', title: 'Course deleted' });
      setDeletingCourseId(null);
      await loadData();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Failed to delete course',
        message: err instanceof Error ? err.message : 'An unknown error occurred',
      });
    }
  };

  const currentAvailableSubjects = useMemo(() => {
    if (!formData.classId) return subjects;
    return subjects.filter((s) => s.classId === formData.classId);
  }, [subjects, formData.classId]);

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Total LMS Courses
          </p>
          <p className="text-2xl font-bold text-purple-700 mt-1">{stats.totalCourses}</p>
          <p className="text-xs text-neutral-500 mt-0.5">Active curriculum modules</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Classes Enrolled
          </p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{stats.classesReached}</p>
          <p className="text-xs text-neutral-500 mt-0.5">Auto-enrolled student cohorts</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Curriculum Lessons
          </p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.totalLessons}</p>
          <p className="text-xs text-neutral-500 mt-0.5">Total authored lessons & notes</p>
        </div>
      </div>

      {/* Control Bar: Search, Filter, and Create Button */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <input
              type="text"
              placeholder="Search courses by title, subject, or teacher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs sm:text-sm border border-neutral-300 rounded-xl py-2 px-3 pl-9 bg-neutral-50/50 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
            />
            <svg
              className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="text-xs sm:text-sm border border-neutral-300 rounded-xl py-2 px-3 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.grade} - Section {cls.section}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Button
            variant="primary"
            size="sm"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Create New Course</span>
          </Button>
        </div>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center text-neutral-500 shadow-xs animate-pulse">
          Loading courses...
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto text-xl font-bold">
            📚
          </div>
          <h3 className="text-base font-bold text-neutral-900">No Courses Found</h3>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
            {searchQuery || selectedClassFilter
              ? 'No courses match the current search filters. Try adjusting your query.'
              : 'No courses have been created yet. Click "Create New Course" to establish curriculum modules.'}
          </p>
          {!searchQuery && !selectedClassFilter && (
            <Button variant="primary" size="sm" onClick={openCreateModal}>
              Create First Course
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Course Cover Banner */}
                <div
                  className="h-28 p-4 flex flex-col justify-between relative overflow-hidden"
                  style={{ backgroundColor: course.coverColor }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-neutral-900 uppercase tracking-wider backdrop-blur-xs">
                      {course.subjectCode || 'CURRICULUM'}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-black/30 text-white backdrop-blur-xs">
                      {course.lessonCount} {course.lessonCount === 1 ? 'Lesson' : 'Lessons'}
                    </span>
                  </div>

                  <div className="relative z-10">
                    <span className="text-xs font-semibold text-white/90 drop-shadow-xs">
                      {course.subjectName}
                    </span>
                  </div>
                </div>

                {/* Course Body Content */}
                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 group-hover:text-purple-700 transition-colors line-clamp-1">
                      {course.title}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1 line-clamp-2 min-h-[32px]">
                      {course.description || 'No course overview provided.'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 space-y-1.5 text-xs text-neutral-600">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400 font-medium">Class:</span>
                      <span className="font-semibold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded-md">
                        {course.className}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400 font-medium">Instructor:</span>
                      <span className="font-medium text-neutral-800">{course.teacherName}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                      <span>✓ Students Enrolled:</span>
                      <span className="font-bold">Automatic via Class</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between gap-2">
                <Link
                  href={`/teacher/courses/${course.id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900"
                >
                  <span>Manage Lessons</span>
                  <span className="text-sm leading-none">&rarr;</span>
                </Link>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(course)}
                    className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/60 rounded-lg transition-colors text-xs font-medium"
                    title="Edit course details"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingCourseId(course.id)}
                    className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors text-xs font-medium"
                    title="Delete course"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Course Modal */}
      {(isCreateModalOpen || editingCourse) && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingCourse(null);
          }}
          title={editingCourse ? 'Edit Course Details' : 'Create New LMS Course'}
          size="md"
        >
          <form onSubmit={handleSaveCourse} className="space-y-4">
            {formError && (
              <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-lg">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Course Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Introduction to Mechanics & Forces"
                className="w-full text-sm border border-neutral-300 rounded-lg p-2.5 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Course Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe key learning outcomes, modules, or prerequisites..."
                rows={3}
                className="w-full text-sm border border-neutral-300 rounded-lg p-2.5 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                  Enrolled Class <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.classId}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="w-full text-sm border border-neutral-300 rounded-lg p-2.5 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">-- Choose Class --</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.grade} - Section {cls.section}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-purple-700 font-medium mt-1">
                  Enrolls all students in this class automatically.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                  Academic Subject <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                  className="w-full text-sm border border-neutral-300 rounded-lg p-2.5 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">-- Choose Subject --</option>
                  {currentAvailableSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Assigned Instructor <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.teacherId}
                onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                className="w-full text-sm border border-neutral-300 rounded-lg p-2.5 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">-- Select Instructor --</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.department ? `(${t.department})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Cover Color Palette Picker */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Course Theme Cover Color
              </label>
              <div className="flex items-center gap-2">
                {PRESET_COVER_COLORS.map((col) => (
                  <button
                    key={col.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, coverColor: col.value })}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      formData.coverColor === col.value
                        ? 'ring-2 ring-purple-600 ring-offset-2 scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: col.value }}
                    title={col.label}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-200 mt-6">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingCourse(null);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Saving...'
                  : editingCourse
                  ? 'Update Course'
                  : 'Create Course'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCourseId && (
        <Modal
          isOpen={true}
          onClose={() => setDeletingCourseId(null)}
          title="Confirm Course Deletion"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Are you sure you want to delete this course? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-200">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeletingCourseId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDeleteCourse(deletingCourseId)}
              >
                Delete Course
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
