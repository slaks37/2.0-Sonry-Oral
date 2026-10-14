import { z } from 'zod';

/**
 * Coordinate convention:
 * - 0 to 100 percentage
 * - Top-left origin
 * - Width and height as percentages
 * - Nullable when localization is unavailable
 */
export const BoundingBoxSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(0.01).max(100),
  height: z.number().min(0.01).max(100),
});

export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

export const DEFAULT_QUALITY_FACTORS = {
  blur: false,
  glare: false,
  darkness: false,
  obstruction: false,
  poorFraming: false,
  nonOralImage: false,
  teethInvisible: false,
};

export const QualityFactorsSchema = z.object({
  blur: z.boolean().default(false),
  glare: z.boolean().default(false),
  darkness: z.boolean().default(false),
  obstruction: z.boolean().default(false),
  poorFraming: z.boolean().default(false),
  nonOralImage: z.boolean().default(false),
  teethInvisible: z.boolean().default(false),
});

export const ToothViewTypeSchema = z.enum([
  'FRONT_VIEW',
  'UPPER_OCCLUSAL',
  'LOWER_OCCLUSAL',
  'RIGHT_BUCCAL',
  'LEFT_BUCCAL',
  'GENERAL_VIEW',
]);

export const ImageAssessabilitySchema = z.enum([
  'ASSESSABLE',
  'PARTIALLY_ASSESSABLE',
  'UNASSESSABLE',
]);

export const DEFAULT_IMAGE_ASSESSMENT = {
  state: 'ASSESSABLE' as const,
  isOralCavity: true,
  teethVisible: true,
  viewType: 'FRONT_VIEW' as const,
  qualityFactors: DEFAULT_QUALITY_FACTORS,
  quality: 'good' as const,
  reason: 'Memenuhi syarat penilaian visual screening.',
};

export const ImageAssessmentSchema = z.object({
  state: ImageAssessabilitySchema.default('ASSESSABLE'),
  isOralCavity: z.boolean().default(true),
  teethVisible: z.boolean().default(true),
  viewType: ToothViewTypeSchema.default('FRONT_VIEW'),
  qualityFactors: QualityFactorsSchema.default(DEFAULT_QUALITY_FACTORS),
  quality: z.enum(['good', 'poor', 'unable_to_assess']).default('good'),
  reason: z.string().min(1),
});

export type ImageAssessment = z.infer<typeof ImageAssessmentSchema>;
export const ImageQualityResponseSchema = ImageAssessmentSchema;
export type ImageQualityResponse = ImageAssessment;

export const LocalizedToothRegionSchema = z.object({
  regionId: z.string(),
  label: z.string(),
  fdiNotation: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).default(0.8),
  boundingBox: BoundingBoxSchema.nullable().default(null),
});

export const ToothLocalizationResultSchema = z.object({
  regions: z.array(LocalizedToothRegionSchema).default([]),
  detectionMethod: z.enum(['interim_llm_visual_cue', 'validated_detector']).default('interim_llm_visual_cue'),
  isClinicallyValidated: z.boolean().default(false),
});

export const VisualFindingSchema = z.object({
  id: z.string().default(() => `VF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`),
  findingType: z.string().min(1),
  location: z.string().default('General tooth surface'),
  visualCues: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.7),
  severity: z.enum(['Low', 'Medium', 'High']).default('Low'),
  boundingBox: BoundingBoxSchema.nullable().default(null),
  unconfirmed: z.boolean().default(true),
  clinicalNote: z.string().optional(),
});

export const CodingSuggestionSchema = z.object({
  code: z.string().min(1),
  codeSystem: z.enum(['WHO_ICD10', 'ICD10_CM', 'LOCAL_REGISTRY']).default('WHO_ICD10'),
  codeVersion: z.string().default('2019'),
  title: z.string().min(1),
  category: z.string().default('Caries'),
  confidence: z.number().min(0).max(1).default(0.7),
  clinicalRationale: z.string().default(''),
  requiresClinicalConfirmation: z.boolean().default(true),
  abstentionReason: z.string().optional(),
});

export const ClinicianReviewStatusSchema = z.object({
  status: z.enum(['unreviewed', 'confirmed', 'rejected', 'modified']).default('unreviewed'),
  reviewedBy: z.string().optional(),
  reviewedAt: z.string().optional(),
  notes: z.string().optional(),
});

export const OralIssueSchema = z.object({
  diseaseName: z.string().min(1),
  description: z.string().default(''),
  boundingBox: BoundingBoxSchema.nullable().default(null),
  codingSuggestion: CodingSuggestionSchema.optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type OralIssue = z.infer<typeof OralIssueSchema>;

export const HygieneAssessmentEnum = z.enum(['Good', 'Fair', 'Poor', 'Not Assessable']);
export type HygieneAssessment = z.infer<typeof HygieneAssessmentEnum>;

export const SummaryDiagnosisStatusEnum = z.enum([
  'NO_VISIBLE_ABNORMALITY',
  'ABNORMALITY_SUSPECTED',
  'UNABLE_TO_ASSESS',
]);

export const StagedOralAnalysisResponseSchema = z.object({
  imageAssessment: ImageAssessmentSchema.default(DEFAULT_IMAGE_ASSESSMENT),
  localizedTeeth: ToothLocalizationResultSchema.default({
    regions: [],
    detectionMethod: 'interim_llm_visual_cue',
    isClinicallyValidated: false,
  }),
  visualFindings: z.array(VisualFindingSchema).default([]),
  codingSuggestions: z.array(CodingSuggestionSchema).default([]),
  reviewStatus: ClinicianReviewStatusSchema.default({ status: 'unreviewed' }),
  hygieneAssessment: HygieneAssessmentEnum.default('Fair'),
  summaryDiagnosisStatus: SummaryDiagnosisStatusEnum.default('ABNORMALITY_SUSPECTED'),
  issues: z.array(OralIssueSchema).default([]),
});

export const OralAnalysisResponseSchema = StagedOralAnalysisResponseSchema;
export type OralAnalysisResponse = z.infer<typeof StagedOralAnalysisResponseSchema>;

export const ClinicalReportResponseSchema = z.object({
  nutritionResult: z.enum(['Normal', 'Needs Monitoring', 'Needs Referral']).default('Needs Monitoring'),
  nutritionReason: z.string().min(1),
  oralResult: z.enum(['Healthy', 'At Risk of Caries', 'Needs Referral']).default('At Risk of Caries'),
  oralReason: z.string().min(1),
  conclusion: z.string().min(1),
  recommendations: z.array(z.string()).default([]),
  clinicalDisclaimers: z.array(z.string()).default([]),
});

export type ClinicalReportResponse = z.infer<typeof ClinicalReportResponseSchema>;

/**
 * Normalizes raw bounding box coordinates to [0, 100] percentage range.
 * Returns NULL if coordinates are missing, zero-area, or invalid.
 * NEVER creates a zero-area bounding box!
 */
export const normalizeBoundingBox = (raw: any): BoundingBox | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  let x = typeof raw.x === 'number' ? raw.x : NaN;
  let y = typeof raw.y === 'number' ? raw.y : NaN;
  let width = typeof raw.width === 'number' ? raw.width : NaN;
  let height = typeof raw.height === 'number' ? raw.height : NaN;

  if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
    return null;
  }

  // Handle case where model returned coordinates normalized in [0, 1]
  if (x <= 1 && y <= 1 && width <= 1 && height <= 1 && (x > 0 || y > 0 || width > 0 || height > 0)) {
    x *= 100;
    y *= 100;
    width *= 100;
    height *= 100;
  }

  // Clamp coordinates within 0-100 safely
  const clampedX = Math.max(0, Math.min(100, x));
  const clampedY = Math.max(0, Math.min(100, y));
  const clampedWidth = Math.max(0, Math.min(100 - clampedX, Math.max(0, width)));
  const clampedHeight = Math.max(0, Math.min(100 - clampedY, Math.max(0, height)));

  if (clampedWidth <= 0.05 || clampedHeight <= 0.05) {
    return null;
  }

  return {
    x: Math.round(clampedX * 100) / 100,
    y: Math.round(clampedY * 100) / 100,
    width: Math.round(clampedWidth * 100) / 100,
    height: Math.round(clampedHeight * 100) / 100,
  };
};
