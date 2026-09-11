/**
 * Central barrel export for all data repositories.
 * NOTE: Components should ONLY import data access methods from this repository layer.
 * Direct access to localStorage outside src/lib/storage/ is blocked by ESLint.
 */

export * from './base';
export * from './schools';
export * from './campuses';
export * from './academicYears';
export * from './users';
export * from './students';
export * from './parents';
export * from './studentParents';
export * from './teachers';
export * from './classes';
export * from './subjects';
export * from './timetableSlots';
export * from './attendance';
export * from './feeStructures';
export * from './studentConcessions';
export * from './feeInvoices';
export * from './feeDefaulters';
export * from './parentFees';
export * from './courses';
export * from './lessons';
export * from './assignments';
export * from './submissions';
export * from './exams';
export * from './examResults';
export * from './announcements';
export * from './messages';
export * from './notifications';
export * from './whatsappLog';
export * from './settings';
export * from './reportCards';
export * from './session';
export * from './lessonCompletions';
export * from './studentDashboard';
export * from './networkDashboard';
export * from './meta';
