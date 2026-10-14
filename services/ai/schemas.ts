import { z } from 'zod';

/**
 * Coordinate convention:
 * - 0 to 100 percentage
 * - Top-left origin
 * - Width and height as percentages
 * - Clamped within [0, 100]
 */
export const BoundingBoxSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(0).max(100),
  height: z.number().min(0).max(100),
});

export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

export const OralIssueSchema = z.object({
  diseaseName: z.string().min(1),
  description: z.string().default(''),
  boundingBox: BoundingBoxSchema,
});

export type OralIssue = z.infer<typeof OralIssueSchema>;

export const HygieneAssessmentEnum = z.enum(['Good', 'Fair', 'Poor', 'Not Assessable']);
export type HygieneAssessment = z.infer<typeof HygieneAssessmentEnum>;

export const OralAnalysisResponseSchema = z.object({
  issues: z.array(OralIssueSchema).default([]),
  hygieneAssessment: HygieneAssessmentEnum.default('Fair'),
});

export type OralAnalysisResponse = z.infer<typeof OralAnalysisResponseSchema>;

export const ImageQualityResponseSchema = z.object({
  quality: z.enum(['good', 'poor', 'unable_to_assess']),
  reason: z.string().min(1),
});

export type ImageQualityResponse = z.infer<typeof ImageQualityResponseSchema>;

export const ClinicalReportResponseSchema = z.object({
  nutritionResult: z.enum(['Normal', 'Needs Monitoring', 'Needs Referral']).default('Needs Monitoring'),
  nutritionReason: z.string().min(1),
  oralResult: z.enum(['Healthy', 'At Risk of Caries', 'Needs Referral']).default('At Risk of Caries'),
  oralReason: z.string().min(1),
  conclusion: z.string().min(1),
  recommendations: z.array(z.string()).default([]),
});

export type ClinicalReportResponse = z.infer<typeof ClinicalReportResponseSchema>;

/**
 * Normalizes and clamps raw bounding box coordinates to [0, 100] range.
 * If invalid or non-numeric, clamps safely.
 */
export const normalizeBoundingBox = (raw: any): BoundingBox => {
  let x = typeof raw?.x === 'number' ? raw.x : 0;
  let y = typeof raw?.y === 'number' ? raw.y : 0;
  let width = typeof raw?.width === 'number' ? raw.width : 0;
  let height = typeof raw?.height === 'number' ? raw.height : 0;

  // Handle case where model returned coordinates in [0, 1] instead of [0, 100]
  if (x <= 1 && y <= 1 && width <= 1 && height <= 1 && (x > 0 || y > 0 || width > 0 || height > 0)) {
    x *= 100;
    y *= 100;
    width *= 100;
    height *= 100;
  }

  // Clamp within 0-100
  x = Math.max(0, Math.min(100, x));
  y = Math.max(0, Math.min(100, y));
  width = Math.max(0, Math.min(100 - x, width));
  height = Math.max(0, Math.min(100 - y, height));

  return {
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    width: Math.round(width * 100) / 100,
    height: Math.round(height * 100) / 100,
  };
};
