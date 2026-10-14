
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


export interface BoundingBox {
  x: number; // percentage from left
  y: number; // percentage from top
  width: number; // percentage
  height: number; // percentage
}

export interface OralIssue {
  diseaseName: string;
  description: string;
  boundingBox: BoundingBox;
}

export interface OralAnalysisResult {
  issues: OralIssue[];
  hygieneAssessment: 'Good' | 'Fair' | 'Poor';
}


// New type to hold analysis for a single image
export interface OralAnalysis {
  imageFile?: File;
  imagePreview: string;
  analysisResult: OralAnalysisResult | null;
  imageQuality?: 'good' | 'poor' | 'checking' | 'unable_to_assess';
  qualityReason?: string;
}

export type GrowthStatus = 'Tinggi Badan Sesuai Usia' | 'Perawakan Pendek';

export interface HealthReportData {
    nutritionResult: 'Normal' | 'Needs Monitoring' | 'Needs Referral';
    // Metrics for children < 5 years
    stuntingStatus: string;
    heightForAgeZScore: number | null;
    weightStatus: string; // Underweight status
    weightForAgeZScore: number | null;
    wastingStatus: string;
    wastingZScore: number | null;
    lilaStatus: string;
    // Metrics for children >= 5 years
    growthStatus?: GrowthStatus;
    bmi: number | null;
    bmiStatus: string;
    // Common fields
    nutritionReason: string; // Will now contain a Markdown report
    oralResult: 'Healthy' | 'At Risk of Caries' | 'Needs Referral';
    oralReason: string;
    conclusion: string;
    recommendations: string[];
}

// New type for storing a complete record in localStorage
export interface ScreeningRecord {
    id: string; // Unique ID for the record
    date: string; // ISO date string
    patientData: PatientData;
    stuntingData: StuntingScreeningData;
    oralAnalyses: {
        // Store image as base64 for persistence, original file object can't be stored
        imageBase64: string; 
        analysisResult: OralAnalysisResult;
    }[];
    healthReport: HealthReportData;
}
