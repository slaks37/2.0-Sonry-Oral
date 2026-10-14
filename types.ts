export enum AppStep {
  HOME = 'HOME',
  LOGIN = 'LOGIN',
  SIGNUP = 'SIGNUP',
  LANDING = 'LANDING',
  STUNTING_SCREENING = 'STUNTING_SCREENING',
  ORAL_EXAMINATION = 'ORAL_EXAMINATION',
  ANALYZING = 'ANALYZING',
  REPORT = 'REPORT',
  DASHBOARD = 'DASHBOARD',
}

export interface PatientData {
  nik: string; // National Identity Number
  name: string;
  dob: string; // Date of Birth: "YYYY-MM-DD"
  gender: 'Male' | 'Female' | 'Other' | '';
  weight: string;
  height: string;
  headCircumference: string;
  armCircumference: string;
}

// Detailed, age-specific stunting screening data
export interface StuntingScreeningData {
  ageGroup: '0-24' | '>24' | null;
  // Questions for 0-24 months
  exclusiveBreastfeeding: 'yes' | 'no' | '';
  sugarInFormula: 'yes' | 'no' | '';
  mpasiStartDate: string;
  mpasiMenu: string[];
  mpasiTexture: string;
  snackFrequency: string;
  snackType: string;
  sweetDrinkFrequency: string;
  sleepWithBottle: 'yes' | 'no' | '';
  gumCleaningStartDate: string;
  useSpecialToothpaste: 'yes' | 'no' | '';
  // Questions for >24 months
  mainMealsPerDay: string;
  dailyDietIncludes: string[];
  isPickyEater: 'yes' | 'no' | '';
  pickyEaterFoods: string;
  snackFrequencyOutside: string;
  favoriteSnack: string;
  weeklyConsumption: {
    soda: string;
    packagedSnacks: string;
    sweets: string;
    fastFood: string;
  };
  brushingFrequency: string;
  brushingHabits: string[];
  dentalPain: 'yes' | 'no' | '';
}

/**
 * Supported clinical photography views for pediatric dental screening
 */
export type ToothViewType =
  | 'FRONT_VIEW'
  | 'UPPER_OCCLUSAL'
  | 'LOWER_OCCLUSAL'
  | 'RIGHT_BUCCAL'
  | 'LEFT_BUCCAL'
  | 'GENERAL_VIEW';

export type ImageAssessability = 'ASSESSABLE' | 'PARTIALLY_ASSESSABLE' | 'UNASSESSABLE';

export interface QualityFactors {
  blur: boolean;
  glare: boolean;
  darkness: boolean;
  obstruction: boolean;
  poorFraming: boolean;
  nonOralImage: boolean;
  teethInvisible: boolean;
}

export interface ImageAssessment {
  state: ImageAssessability;
  isOralCavity: boolean;
  teethVisible: boolean;
  viewType: ToothViewType;
  qualityFactors: QualityFactors;
  reason: string;
  quality?: 'good' | 'poor' | 'unable_to_assess';
}

/**
 * Coordinate convention:
 * - 0 to 100 percentage
 * - Top-left origin
 * - Width and height as percentages [0, 100]
 */
export interface BoundingBox {
  x: number; // percentage from left
  y: number; // percentage from top
  width: number; // percentage width
  height: number; // percentage height
}

export interface LocalizedToothRegion {
  regionId: string;
  label: string;
  fdiNotation?: string[];
  confidence: number;
  boundingBox: BoundingBox | null;
}

export interface ToothLocalizationResult {
  regions: LocalizedToothRegion[];
  detectionMethod: 'interim_llm_visual_cue' | 'validated_detector';
  isClinicallyValidated: boolean;
}

export interface VisualFinding {
  id: string;
  findingType: string;
  location: string;
  visualCues: string[];
  confidence: number;
  severity: 'Low' | 'Medium' | 'High';
  boundingBox: BoundingBox | null;
  unconfirmed: boolean;
  clinicalNote?: string;
}

export interface CodingSuggestion {
  code: string;
  codeSystem: 'WHO_ICD10' | 'ICD10_CM' | 'LOCAL_REGISTRY';
  codeVersion: string;
  title: string;
  category: string;
  confidence: number;
  clinicalRationale: string;
  requiresClinicalConfirmation: boolean;
  abstentionReason?: string;
}

export interface ClinicianReviewStatus {
  status: 'unreviewed' | 'confirmed' | 'rejected' | 'modified';
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
}

export interface OralIssue {
  diseaseName: string;
  description: string;
  boundingBox: BoundingBox | null; // Permit null when localization is unavailable!
  codingSuggestion?: CodingSuggestion;
  confidence?: number;
}

export interface OralAnalysisResult {
  imageAssessment: ImageAssessment;
  localizedTeeth: ToothLocalizationResult;
  visualFindings: VisualFinding[];
  codingSuggestions: CodingSuggestion[];
  reviewStatus: ClinicianReviewStatus;
  hygieneAssessment: 'Good' | 'Fair' | 'Poor' | 'Not Assessable';
  summaryDiagnosisStatus: 'NO_VISIBLE_ABNORMALITY' | 'ABNORMALITY_SUSPECTED' | 'UNABLE_TO_ASSESS';
  issues: OralIssue[];
}

export type StagedOralAnalysisResult = OralAnalysisResult;

// Type to hold analysis for a single image
export interface OralAnalysis {
  imageFile?: File;
  imagePreview: string;
  viewType?: ToothViewType;
  analysisResult: StagedOralAnalysisResult | null;
  imageQuality?: 'good' | 'poor' | 'checking' | 'unable_to_assess';
  qualityReason?: string;
  imageAssessment?: ImageAssessment;
}

export type GrowthStatus = 'Tinggi Badan Sesuai Usia' | 'Perawakan Pendek';

export interface HealthReportData {
  nutritionResult: 'Normal' | 'Needs Monitoring' | 'Needs Referral';
  // Metrics for children < 5 years
  stuntingStatus: string;
  heightForAgeZScore: number | null;
  weightStatus: string;
  weightForAgeZScore: number | null;
  wastingStatus: string;
  wastingZScore: number | null;
  lilaStatus: string;
  // Metrics for children >= 5 years
  growthStatus?: GrowthStatus;
  bmi: number | null;
  bmiStatus: string;
  // Common fields
  nutritionReason: string;
  oralResult: 'Healthy' | 'At Risk of Caries' | 'Needs Referral';
  oralReason: string;
  conclusion: string;
  recommendations: string[];
  clinicalDisclaimers?: string[];
}

// Persistent screening record
export interface ScreeningRecord {
  id: string;
  date: string;
  patientData: PatientData;
  stuntingData: StuntingScreeningData;
  oralAnalyses: {
    imageBase64: string;
    viewType?: ToothViewType;
    analysisResult: StagedOralAnalysisResult;
  }[];
  healthReport: HealthReportData;
}
