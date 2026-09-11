/**
 * Dynamic grading scale calculation utilities.
 * Reference: DEVELOPMENT_GUIDELINES.md §8 & DATA_MODELS.md §3 (GradeScaleItem)
 */

import { GradeScaleItem } from '@/types';

export const DEFAULT_GRADING_SCALE: GradeScaleItem[] = [
  { grade: 'A*', minPercentage: 90, maxPercentage: 100, gpa: 4.0, description: 'Outstanding' },
  { grade: 'A', minPercentage: 80, maxPercentage: 89.99, gpa: 3.7, description: 'Excellent' },
  { grade: 'B', minPercentage: 70, maxPercentage: 79.99, gpa: 3.0, description: 'Very Good' },
  { grade: 'C', minPercentage: 60, maxPercentage: 69.99, gpa: 2.0, description: 'Good' },
  { grade: 'D', minPercentage: 50, maxPercentage: 59.99, gpa: 1.0, description: 'Satisfactory' },
  { grade: 'F', minPercentage: 0, maxPercentage: 49.99, gpa: 0.0, description: 'Fail' },
];

export interface GradeResult {
  score: number;
  maxScore: number;
  percentage: number;
  grade: string;
  gpa?: number;
  description?: string;
  isPassing: boolean;
}

/**
 * Calculate grade, GPA, and percentage dynamically from a configured scale.
 * Never hardcodes grading thresholds; accepts custom scale from Settings.
 */
export function calculateGrade(
  score: number,
  maxScore: number,
  customScale?: GradeScaleItem[]
): GradeResult {
  if (maxScore <= 0) {
    return {
      score: 0,
      maxScore: 0,
      percentage: 0,
      grade: 'F',
      gpa: 0,
      description: 'Invalid max score',
      isPassing: false,
    };
  }

  const validScore = Math.max(0, score);
  const rawPercentage = (validScore / maxScore) * 100;
  const percentage = Math.round(rawPercentage * 10) / 10;

  const scale = (customScale && customScale.length > 0) ? customScale : DEFAULT_GRADING_SCALE;

  // Sort descending by minPercentage so highest threshold matches first
  const sortedScale = [...scale].sort((a, b) => b.minPercentage - a.minPercentage);

  for (const item of sortedScale) {
    if (percentage >= item.minPercentage) {
      const isPassing = item.grade !== 'F' && (item.gpa ?? 1) > 0;
      return {
        score: validScore,
        maxScore,
        percentage,
        grade: item.grade,
        gpa: item.gpa,
        description: item.description,
        isPassing,
      };
    }
  }

  // Fallback if below all thresholds
  const lowest = sortedScale[sortedScale.length - 1];
  return {
    score: validScore,
    maxScore,
    percentage,
    grade: lowest?.grade ?? 'F',
    gpa: lowest?.gpa ?? 0,
    description: lowest?.description ?? 'Fail',
    isPassing: false,
  };
}

export interface ScaleValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates a custom grading scale configuration.
 * Checks for:
 * 1. At least one tier
 * 2. Non-empty, unique grade labels
 * 3. Range boundaries (0 <= min < max <= 100)
 * 4. Valid GPA values (0 <= GPA <= 10)
 * 5. Range inversions or overlapping tiers
 */
export function validateGradingScale(scale: GradeScaleItem[]): ScaleValidationResult {
  const errors: string[] = [];

  if (!scale || scale.length === 0) {
    errors.push('Grading scale must contain at least one tier.');
    return { isValid: false, errors };
  }

  const seenGrades = new Set<string>();
  for (let i = 0; i < scale.length; i++) {
    const item = scale[i];
    const tierNum = i + 1;

    if (!item.grade || !item.grade.trim()) {
      errors.push(`Tier ${tierNum}: Grade name cannot be empty.`);
    } else {
      const normalized = item.grade.trim().toUpperCase();
      if (seenGrades.has(normalized)) {
        errors.push(`Tier ${tierNum}: Duplicate grade "${item.grade}". Each grade name must be unique.`);
      }
      seenGrades.add(normalized);
    }

    if (typeof item.minPercentage !== 'number' || isNaN(item.minPercentage)) {
      errors.push(`Tier ${tierNum} (${item.grade || 'Unnamed'}): Minimum percentage is required.`);
    } else if (item.minPercentage < 0 || item.minPercentage > 100) {
      errors.push(`Tier ${tierNum} (${item.grade}): Minimum percentage must be between 0 and 100.`);
    }

    if (typeof item.maxPercentage !== 'number' || isNaN(item.maxPercentage)) {
      errors.push(`Tier ${tierNum} (${item.grade || 'Unnamed'}): Maximum percentage is required.`);
    } else if (item.maxPercentage < 0 || item.maxPercentage > 100) {
      errors.push(`Tier ${tierNum} (${item.grade}): Maximum percentage must be between 0 and 100.`);
    }

    if (
      typeof item.minPercentage === 'number' &&
      typeof item.maxPercentage === 'number' &&
      item.minPercentage >= item.maxPercentage
    ) {
      errors.push(
        `Tier ${tierNum} (${item.grade}): Minimum percentage (${item.minPercentage}%) must be strictly less than maximum percentage (${item.maxPercentage}%).`
      );
    }

    if (
      item.gpa !== undefined &&
      (typeof item.gpa !== 'number' || isNaN(item.gpa) || item.gpa < 0 || item.gpa > 10)
    ) {
      errors.push(`Tier ${tierNum} (${item.grade}): GPA must be between 0.0 and 10.0.`);
    }
  }

  // Check for inverted thresholds or overlapping tiers when sorted descending
  const sorted = [...scale].sort((a, b) => b.minPercentage - a.minPercentage);
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    if (current.minPercentage <= next.minPercentage) {
      errors.push(
        `Overlap detected: Grade "${current.grade}" (${current.minPercentage}% - ${current.maxPercentage}%) overlaps with Grade "${next.grade}" (${next.minPercentage}% - ${next.maxPercentage}%).`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export interface GradingPreset {
  id: string;
  name: string;
  description: string;
  scale: GradeScaleItem[];
}

/**
 * Institutional standard preset grading scales.
 */
export function getPresetGradingScales(): GradingPreset[] {
  return [
    {
      id: 'standard-percentage',
      name: 'Standard Percentage (A+ to F)',
      description: 'Standard 6-tier grading scale (A+ ≥ 90, A ≥ 80, B ≥ 70, C ≥ 60, D ≥ 50, F < 50)',
      scale: [
        { grade: 'A+', minPercentage: 90, maxPercentage: 100, gpa: 4.0, description: 'Outstanding' },
        { grade: 'A', minPercentage: 80, maxPercentage: 89.9, gpa: 3.7, description: 'Excellent' },
        { grade: 'B', minPercentage: 70, maxPercentage: 79.9, gpa: 3.0, description: 'Good' },
        { grade: 'C', minPercentage: 60, maxPercentage: 69.9, gpa: 2.0, description: 'Satisfactory' },
        { grade: 'D', minPercentage: 50, maxPercentage: 59.9, gpa: 1.0, description: 'Pass' },
        { grade: 'F', minPercentage: 0, maxPercentage: 49.9, gpa: 0.0, description: 'Fail' },
      ],
    },
    {
      id: 'cambridge-levels',
      name: 'Cambridge International (A* to U)',
      description: 'IGCSE / O-Level scale (A*, A, B, C, D, E, U Ungraded)',
      scale: [
        { grade: 'A*', minPercentage: 90, maxPercentage: 100, gpa: 4.0, description: 'Exceptional' },
        { grade: 'A', minPercentage: 80, maxPercentage: 89.9, gpa: 3.7, description: 'Excellent' },
        { grade: 'B', minPercentage: 70, maxPercentage: 79.9, gpa: 3.0, description: 'Very Good' },
        { grade: 'C', minPercentage: 60, maxPercentage: 69.9, gpa: 2.0, description: 'Good' },
        { grade: 'D', minPercentage: 50, maxPercentage: 59.9, gpa: 1.5, description: 'Satisfactory' },
        { grade: 'E', minPercentage: 40, maxPercentage: 49.9, gpa: 1.0, description: 'Pass' },
        { grade: 'U', minPercentage: 0, maxPercentage: 39.9, gpa: 0.0, description: 'Ungraded' },
      ],
    },
    {
      id: 'us-gpa-honors',
      name: '4.0 GPA Honors System',
      description: 'Rigorous 4.0 scale with plus/minus subdivisions',
      scale: [
        { grade: 'A', minPercentage: 93, maxPercentage: 100, gpa: 4.0, description: 'High Honors' },
        { grade: 'A-', minPercentage: 90, maxPercentage: 92.9, gpa: 3.7, description: 'Honors' },
        { grade: 'B+', minPercentage: 87, maxPercentage: 89.9, gpa: 3.3, description: 'High Achievement' },
        { grade: 'B', minPercentage: 83, maxPercentage: 86.9, gpa: 3.0, description: 'Proficient' },
        { grade: 'B-', minPercentage: 80, maxPercentage: 82.9, gpa: 2.7, description: 'Above Average' },
        { grade: 'C+', minPercentage: 77, maxPercentage: 79.9, gpa: 2.3, description: 'Competent' },
        { grade: 'C', minPercentage: 73, maxPercentage: 76.9, gpa: 2.0, description: 'Average' },
        { grade: 'C-', minPercentage: 70, maxPercentage: 72.9, gpa: 1.7, description: 'Basic Competency' },
        { grade: 'D', minPercentage: 60, maxPercentage: 69.9, gpa: 1.0, description: 'Minimum Pass' },
        { grade: 'F', minPercentage: 0, maxPercentage: 59.9, gpa: 0.0, description: 'Unsatisfactory' },
      ],
    },
    {
      id: 'pass-fail',
      name: 'Pass / Fail Simple System',
      description: 'Binary assessment scale for non-graded subjects',
      scale: [
        { grade: 'Pass', minPercentage: 50, maxPercentage: 100, gpa: 4.0, description: 'Satisfactory Performance' },
        { grade: 'Fail', minPercentage: 0, maxPercentage: 49.9, gpa: 0.0, description: 'Did not meet requirements' },
      ],
    },
  ];
}
