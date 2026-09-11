'use client';

import React, { useState } from 'react';
import { StudentReportCardData } from '@/lib/repositories/reportCards';

export interface ReportCardDocumentProps {
  data: StudentReportCardData;
  isBatchItem?: boolean;
  onRemarksChange?: (studentId: string, newRemarks: string) => void;
}

export function ReportCardDocument({
  data,
  isBatchItem = true,
  onRemarksChange,
}: ReportCardDocumentProps) {
  const [isEditingRemarks, setIsEditingRemarks] = useState(false);
  const [remarksText, setRemarksText] = useState(data.classTeacherRemarks);

  const handleSaveRemarks = () => {
    setIsEditingRemarks(false);
    if (onRemarksChange) {
      onRemarksChange(data.student.id, remarksText);
    }
  };

  const primaryColor = data.branding.primaryColor || '#4B2FA8';
  const isPassed = data.overallPercentage >= 50;

  return (
    <div
      className={`report-card-sheet bg-white border border-ink-200 shadow-sm rounded-card p-6 md:p-8 print:p-6 print:border print:border-ink-300 print:shadow-none print:rounded-none w-full max-w-4xl mx-auto my-6 print:my-0 ${
        isBatchItem ? 'print-page-break print-avoid-break' : ''
      }`}
      style={{
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
      }}
    >
      {/* Top Institutional Branding Accent Stripe */}
      <div
        className="h-2 w-full rounded-t-sm mb-6 print:mb-4"
        style={{ backgroundColor: primaryColor }}
      />

      {/* Header: School crest, name, campus & title */}
      <header className="flex items-start justify-between gap-4 border-b border-ink-200 pb-5 mb-5">
        <div className="flex items-center gap-4">
          {/* Logo or Authoritative Institutional Crest SVG */}
          {data.branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.branding.logoUrl}
              alt={data.branding.schoolName}
              className="w-16 h-16 object-contain rounded"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold shadow-sm shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              <svg
                className="w-9 h-9"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.333A48.41 48.41 0 0012 9.75c-2.551 0-5.056.2-7.5.583V21m15 0h2.25M3 21h2.25"
                />
              </svg>
            </div>
          )}

          <div>
            <h1 className="text-xl font-bold text-ink-900 tracking-tight">
              {data.branding.schoolName}
            </h1>
            <p className="text-xs text-ink-600 mt-0.5">
              {data.campus.name} &bull; {data.campus.address}
            </p>
            <p className="text-[11px] text-ink-500 mt-0.5 font-medium">
              Affiliated & Accredited Academic Institution
            </p>
          </div>
        </div>

        {/* Document Title Badge */}
        <div className="text-right shrink-0">
          <div
            className="inline-block px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider text-white"
            style={{ backgroundColor: primaryColor }}
          >
            Student Progress Report
          </div>
          <p className="text-xs font-semibold text-ink-900 mt-1.5">{data.term}</p>
          <p className="text-[11px] text-ink-500">
            {data.academicYear?.name || 'Academic Session 2026-2027'}
          </p>
        </div>
      </header>

      {/* Student Profile Meta Grid */}
      <section
        aria-label="Student Profile"
        className="bg-ink-50/70 border border-ink-200 rounded-control p-3.5 mb-5 text-xs text-ink-800"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <span className="text-[10px] uppercase font-semibold text-ink-500 block">
              Student Name
            </span>
            <span className="font-bold text-ink-900 text-sm">{data.user.name}</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-semibold text-ink-500 block">
              Admission Number
            </span>
            <span className="font-mono font-medium text-ink-900">{data.student.admissionNumber}</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-semibold text-ink-500 block">
              Class & Section
            </span>
            <span className="font-semibold text-ink-900">
              Grade {data.classObj.grade} — {data.classObj.section}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-semibold text-ink-500 block">
              Date of Issue
            </span>
            <span className="font-medium text-ink-900">{data.issueDate}</span>
          </div>
        </div>
      </section>

      {/* Academic Marks & Subjects Table */}
      <section aria-label="Academic Performance" className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-700">
            Academic Performance
          </h2>
          <span className="text-[11px] text-ink-500">
            Total Subjects: {data.subjects.length}
          </span>
        </div>

        <div className="overflow-hidden border border-ink-200 rounded-control">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-ink-100/70 border-b border-ink-200 font-semibold text-ink-700">
                <th className="py-2.5 px-3">Subject</th>
                <th className="py-2.5 px-3 text-center">Max Marks</th>
                <th className="py-2.5 px-3 text-center">Marks Obtained</th>
                <th className="py-2.5 px-3 text-center">Percentage</th>
                <th className="py-2.5 px-3 text-center">Grade</th>
                <th className="py-2.5 px-3">Remarks / Evaluation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {data.subjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-ink-500">
                    No examination records scheduled for this term.
                  </td>
                </tr>
              ) : (
                data.subjects.map((sub, idx) => (
                  <tr
                    key={sub.subjectId || idx}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-ink-50/40'}
                  >
                    <td className="py-2 px-3 font-medium text-ink-900">
                      <span>{sub.subjectName}</span>
                      <span className="text-[10px] text-ink-500 ml-1.5 font-mono">
                        ({sub.subjectCode})
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center tabular-nums text-ink-700">
                      {sub.maxMarks}
                    </td>
                    <td className="py-2 px-3 text-center tabular-nums font-semibold text-ink-900">
                      {sub.isAbsent ? (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                          ABS
                        </span>
                      ) : sub.marksObtained !== null ? (
                        sub.marksObtained
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2 px-3 text-center tabular-nums text-ink-700">
                      {sub.percentage !== null ? `${sub.percentage}%` : '-'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          sub.grade === 'A+' || sub.grade === 'A'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sub.grade === 'B' || sub.grade === 'C'
                            ? 'bg-blue-100 text-blue-800'
                            : sub.grade === 'F'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-ink-100 text-ink-800'
                        }`}
                      >
                        {sub.grade}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-ink-600 text-[11px]">{sub.remarks}</td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Table Footer: Totals */}
            <tfoot>
              <tr className="bg-ink-100 border-t-2 border-ink-300 font-bold text-ink-900">
                <td className="py-2.5 px-3 uppercase tracking-wide text-[11px]">
                  Grand Total
                </td>
                <td className="py-2.5 px-3 text-center tabular-nums">
                  {data.totalMaxMarks}
                </td>
                <td className="py-2.5 px-3 text-center tabular-nums text-primary-900 font-extrabold">
                  {data.totalMarksObtained}
                </td>
                <td className="py-2.5 px-3 text-center tabular-nums">
                  {data.overallPercentage}%
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span className="inline-block px-2.5 py-1 rounded bg-ink-900 text-white text-xs font-black">
                    {data.overallGrade}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-[11px]">
                  <span
                    className={`font-semibold ${
                      isPassed ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {isPassed ? '✓ Passed & Qualified' : '⚠ Academic Reinforcement Advised'}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Two-Column Grid: Attendance Summary & Class Teacher Remarks */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6 print:grid-cols-12">
        {/* Attendance Summary (4 cols) */}
        <div className="md:col-span-4 print:col-span-4 border border-ink-200 rounded-control p-3.5 bg-ink-50/50 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-700 mb-2.5 flex items-center gap-1.5">
              <span>📅</span> Attendance Summary
            </h3>
            <div className="space-y-1.5 text-xs text-ink-700">
              <div className="flex justify-between">
                <span className="text-ink-500">Working Days:</span>
                <span className="font-semibold text-ink-900 tabular-nums">
                  {data.attendance.totalDays}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Days Present:</span>
                <span className="font-semibold text-emerald-700 tabular-nums">
                  {data.attendance.presentCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Days Absent:</span>
                <span className="font-semibold text-rose-700 tabular-nums">
                  {data.attendance.absentCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Days Late:</span>
                <span className="font-semibold text-amber-700 tabular-nums">
                  {data.attendance.lateCount}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-ink-200 pt-2.5 mt-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-800">Attendance Rate:</span>
            <span className="text-sm font-bold text-ink-900 tabular-nums">
              {data.attendance.percentage}%
            </span>
          </div>
        </div>

        {/* Class Teacher Remarks (8 cols) */}
        <div className="md:col-span-8 print:col-span-8 border border-ink-200 rounded-control p-3.5 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-700 flex items-center gap-1.5">
                <span>💬</span> Class Teacher&apos;s Remarks
              </h3>

              {/* Remarks inline edit toggle (Screen only) */}
              <div className="print:hidden">
                {!isEditingRemarks ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingRemarks(true)}
                    className="text-[11px] text-primary-700 hover:text-primary-900 underline font-medium cursor-pointer"
                  >
                    Edit Remarks
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveRemarks}
                    className="text-[11px] bg-primary-700 text-white px-2 py-0.5 rounded font-semibold cursor-pointer"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>

            {isEditingRemarks ? (
              <textarea
                value={remarksText}
                onChange={(e) => setRemarksText(e.target.value)}
                className="w-full text-xs p-2 border border-primary-400 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 font-sans"
                rows={3}
              />
            ) : (
              <p className="text-xs text-ink-700 italic leading-relaxed pt-1">
                &ldquo;{remarksText}&rdquo;
              </p>
            )}
          </div>

          <div className="mt-4 pt-2 border-t border-ink-100 flex items-center justify-between text-[11px] text-ink-500">
            <span>Evaluator: {data.classTeacherName || 'Homeroom Teacher'}</span>
            <span>Overall Status: {isPassed ? 'Promoted / Good Standing' : 'Conditional'}</span>
          </div>
        </div>
      </section>

      {/* Institutional Signatures and School Seal */}
      <footer className="border-t border-ink-200 pt-8 mt-6">
        <div className="grid grid-cols-3 gap-6 text-center text-xs">
          {/* Class Teacher Signature */}
          <div className="flex flex-col items-center">
            <div className="w-3/4 border-b border-ink-400 pb-1 mb-1.5 h-7 flex items-end justify-center">
              <span className="text-[11px] text-ink-400 italic">Signed</span>
            </div>
            <p className="font-semibold text-ink-800 text-[11px]">Class Teacher</p>
            <p className="text-[10px] text-ink-500">{data.classTeacherName || 'Authorized Signatory'}</p>
          </div>

          {/* Principal Signature */}
          <div className="flex flex-col items-center">
            <div className="w-3/4 border-b border-ink-400 pb-1 mb-1.5 h-7 flex items-end justify-center">
              <span className="text-[11px] text-ink-400 italic">Verified</span>
            </div>
            <p className="font-semibold text-ink-800 text-[11px]">Principal / Head of School</p>
            <p className="text-[10px] text-ink-500">{data.principalName || 'Campus Administration'}</p>
          </div>

          {/* Parent Signature */}
          <div className="flex flex-col items-center">
            <div className="w-3/4 border-b border-ink-400 pb-1 mb-1.5 h-7" />
            <p className="font-semibold text-ink-800 text-[11px]">Parent / Guardian</p>
            <p className="text-[10px] text-ink-500">Acknowledgement Signature</p>
          </div>
        </div>

        {/* Compact Grading Scale Legend */}
        <div className="mt-7 pt-3 border-t border-dashed border-ink-200 text-[10px] text-ink-500 flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold uppercase tracking-wider text-ink-600">
            Grading Scale:
          </span>
          <span>A+ : 90–100%</span>
          <span>A : 80–89%</span>
          <span>B : 70–79%</span>
          <span>C : 60–69%</span>
          <span>D : 50–59%</span>
          <span>F : Below 50%</span>
          <span className="text-ink-400 ml-auto font-mono">
            ID: {data.student.id} &bull; {data.school.id}
          </span>
        </div>
      </footer>
    </div>
  );
}
