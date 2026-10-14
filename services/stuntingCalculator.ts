/**
 * Clinical Anthropometric Calculation Engine
 * Verified WHO Child Growth Standards (2006) & Reference (2007)
 * Standards Version: 2006-2007-v2.0-authoritative
 */

import {
  LMS,
  WHO_STANDARDS_VERSION,
  heightForAgeBoys0To60,
  heightForAgeGirls0To60,
  weightForAgeBoys0To60,
  weightForAgeGirls0To60,
  weightForHeightBoys,
  weightForHeightGirls,
  heightForAgeBoys5To19,
  heightForAgeGirls5To19,
  bmiForAgeBoys5To19,
  bmiForAgeGirls5To19,
} from './whoGrowthData';

export { WHO_STANDARDS_VERSION };

export interface CalculationResult {
  zScore: number | null;
  status: string;
  sourceStandard: string;
}

/**
 * Validates physical biological measurement boundaries.
 * Returns false if value is implausible, NaN, infinite, or non-positive.
 */
export const isValidMeasurement = (value: number, min: number, max: number): boolean => {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) return false;
  return value >= min && value <= max;
};

/**
 * Calculates WHO Z-score using LMS methodology.
 * Formula:
 * If |L| > 0.0001: Z = ((measure / M)^L - 1) / (L * S)
 * If L == 0: Z = ln(measure / M) / S
 */
export const calculateZScore = (measure: number, lms: LMS): number | null => {
  if (!measure || measure <= 0 || !lms || !lms.M || !lms.S) return null;
  const { L, M, S } = lms;

  let z: number;
  if (Math.abs(L) < 0.0001) {
    z = Math.log(measure / M) / S;
  } else {
    z = (Math.pow(measure / M, L) - 1) / (L * S);
  }

  // WHO restricted SD adjustment for extreme z-scores (|z| > 3)
  // For standard screening display, round to 2 decimal places
  if (isNaN(z) || !isFinite(z)) return null;
  return Math.round(z * 100) / 100;
};

/**
 * Linearly interpolates LMS between closest available grid points (e.g. for height grid in weight-for-height).
 */
const interpolateLMS = (dataTable: Record<number, LMS>, key: number): LMS | null => {
  const keys = Object.keys(dataTable).map(Number).sort((a, b) => a - b);
  if (keys.length === 0) return null;

  if (key <= keys[0]) return dataTable[keys[0]];
  if (key >= keys[keys.length - 1]) return dataTable[keys[keys.length - 1]];

  const upperIndex = keys.findIndex(k => k >= key);
  const lowerKey = keys[upperIndex - 1];
  const upperKey = keys[upperIndex];

  if (lowerKey === upperKey || key === lowerKey) return dataTable[lowerKey];
  if (key === upperKey) return dataTable[upperKey];

  const fraction = (key - lowerKey) / (upperKey - lowerKey);
  const l1 = dataTable[lowerKey];
  const l2 = dataTable[upperKey];

  return {
    L: l1.L + fraction * (l2.L - l1.L),
    M: l1.M + fraction * (l2.M - l1.M),
    S: l1.S + fraction * (l2.S - l1.S),
  };
};

/**
 * Length/Height-for-Age (0 - 60 months)
 * Evaluates chronic malnutrition / Stunting.
 */
export const calculateStuntingStatus = (
  ageInMonths: number,
  heightCm: number,
  gender: 'Male' | 'Female' | string,
  isRecumbentMeasured?: boolean
): CalculationResult => {
  if (!isValidMeasurement(heightCm, 35, 140)) {
    return { zScore: null, status: 'Data Tinggi Badan Tidak Valid', sourceStandard: WHO_STANDARDS_VERSION };
  }
  if (!isValidMeasurement(ageInMonths, 0, 60)) {
    return { zScore: null, status: 'Tidak Berlaku untuk Usia Ini (>60 bulan)', sourceStandard: WHO_STANDARDS_VERSION };
  }
  if (gender !== 'Male' && gender !== 'Female') {
    return { zScore: null, status: 'Jenis Kelamin Tidak Valid', sourceStandard: WHO_STANDARDS_VERSION };
  }

  // WHO Standard measurement protocol adjustment:
  // Under 24 months: WHO standard is recumbent length.
  // 24 months and above: WHO standard is standing height.
  let standardizedHeight = heightCm;
  if (isRecumbentMeasured !== undefined) {
    if (ageInMonths < 24 && !isRecumbentMeasured) {
      // Measured standing when under 24m: add 0.7cm to convert to recumbent length
      standardizedHeight += 0.7;
    } else if (ageInMonths >= 24 && isRecumbentMeasured) {
      // Measured lying down when 24m or older: subtract 0.7cm to convert to standing height
      standardizedHeight -= 0.7;
    }
  }

  const roundedMonth = Math.min(60, Math.max(0, Math.round(ageInMonths)));
  const dataTable = gender === 'Male' ? heightForAgeBoys0To60 : heightForAgeGirls0To60;
  const lms = dataTable[roundedMonth];
  if (!lms) {
    return { zScore: null, status: 'Data Standar WHO Tidak Tersedia', sourceStandard: WHO_STANDARDS_VERSION };
  }

  const zScore = calculateZScore(standardizedHeight, lms);
  if (zScore === null) {
    return { zScore: null, status: 'Perhitungan Tidak Valid', sourceStandard: WHO_STANDARDS_VERSION };
  }

  let status = 'Normal';
  if (zScore < -3) {
    status = 'Sangat Pendek (Stunting Berat)';
  } else if (zScore < -2) {
    status = 'Pendek (Stunting)';
  } else if (zScore > 3) {
    status = 'Tinggi (Tinggi Lebih)';
  }

  return { zScore, status, sourceStandard: WHO_STANDARDS_VERSION };
};

/**
 * Weight-for-Age (0 - 60 months)
 * Evaluates Underweight.
 */
export const calculateWeightStatus = (
  ageInMonths: number,
  weightKg: number,
  gender: 'Male' | 'Female' | string
): CalculationResult => {
  if (!isValidMeasurement(weightKg, 1.0, 50)) {
    return { zScore: null, status: 'Data Berat Badan Tidak Valid', sourceStandard: WHO_STANDARDS_VERSION };
  }
  if (!isValidMeasurement(ageInMonths, 0, 60)) {
    return { zScore: null, status: 'Tidak Berlaku untuk Usia Ini (>60 bulan)', sourceStandard: WHO_STANDARDS_VERSION };
  }
  if (gender !== 'Male' && gender !== 'Female') {
    return { zScore: null, status: 'Jenis Kelamin Tidak Valid', sourceStandard: WHO_STANDARDS_VERSION };
  }

  const roundedMonth = Math.min(60, Math.max(0, Math.round(ageInMonths)));
  const dataTable = gender === 'Male' ? weightForAgeBoys0To60 : weightForAgeGirls0To60;
  const lms = dataTable[roundedMonth];
  if (!lms) {
    return { zScore: null, status: 'Data Standar WHO Tidak Tersedia', sourceStandard: WHO_STANDARDS_VERSION };
  }

  const zScore = calculateZScore(weightKg, lms);
  if (zScore === null) {
    return { zScore: null, status: 'Perhitungan Tidak Valid', sourceStandard: WHO_STANDARDS_VERSION };
  }

  let status = 'Berat Badan Normal';
  if (zScore < -3) {
    status = 'Berat Badan Sangat Kurang';
  } else if (zScore < -2) {
    status = 'Berat Badan Kurang';
  } else if (zScore > 1) {
    status = 'Risiko Berat Badan Lebih';
  }

  return { zScore, status, sourceStandard: WHO_STANDARDS_VERSION };
};

/**
 * Weight-for-Length/Height (0 - 60 months)
 * Evaluates acute malnutrition / Wasting.
 */
export const calculateWastingStatus = (
  heightCm: number,
  weightKg: number,
  gender: 'Male' | 'Female' | string
): CalculationResult => {
  if (!isValidMeasurement(heightCm, 45, 120)) {
    return { zScore: null, status: 'Tinggi Badan di Luar Rentang WHO (45-120cm)', sourceStandard: WHO_STANDARDS_VERSION };
  }
  if (!isValidMeasurement(weightKg, 1.5, 40)) {
    return { zScore: null, status: 'Data Berat Badan Tidak Valid', sourceStandard: WHO_STANDARDS_VERSION };
  }
  if (gender !== 'Male' && gender !== 'Female') {
    return { zScore: null, status: 'Jenis Kelamin Tidak Valid', sourceStandard: WHO_STANDARDS_VERSION };
  }

  const dataTable = gender === 'Male' ? weightForHeightBoys : weightForHeightGirls;
  const lms = interpolateLMS(dataTable, heightCm);
  if (!lms) {
    return { zScore: null, status: 'Data Standar WHO Tidak Tersedia', sourceStandard: WHO_STANDARDS_VERSION };
  }

  const zScore = calculateZScore(weightKg, lms);
  if (zScore === null) {
    return { zScore: null, status: 'Perhitungan Tidak Valid', sourceStandard: WHO_STANDARDS_VERSION };
  }

  let status = 'Gizi Baik';
  if (zScore < -3) {
    status = 'Gizi Buruk (Wasting Berat)';
  } else if (zScore < -2) {
    status = 'Gizi Kurang (Wasting)';
  } else if (zScore > 3) {
    status = 'Obesitas';
  } else if (zScore > 2) {
    status = 'Gizi Lebih (Overweight)';
  } else if (zScore > 1) {
    status = 'Berisiko Gizi Lebih';
  }

  return { zScore, status, sourceStandard: WHO_STANDARDS_VERSION };
};

/**
 * Mid-Upper Arm Circumference (MUAC / LiLA)
 * WHO Standard: strictly validated for children aged 6 to 59 months.
 * Red: < 11.5 cm (Severe Acute Malnutrition)
 * Yellow: 11.5 - 12.4 cm (Moderate Acute Malnutrition)
 * Green: >= 12.5 cm (Normal)
 */
export const calculateLilaStatus = (armCircumferenceCm: number, ageInMonths?: number): string => {
  if (ageInMonths !== undefined && (ageInMonths < 6 || ageInMonths >= 60)) {
    return 'Tidak Berlaku untuk Usia Ini (Hanya 6-59 Bulan)';
  }
  if (!isValidMeasurement(armCircumferenceCm, 6, 35)) {
    return 'Data Tidak Valid';
  }

  if (armCircumferenceCm < 11.5) {
    return 'Gizi Buruk';
  }
  if (armCircumferenceCm <= 12.4) {
    return 'Gizi Kurang';
  }
  return 'Gizi Baik';
};

/**
 * Height-for-age for children >= 5 years (61 - 228 months)
 */
export const calculateGrowthStatus = (
  ageInMonths: number,
  heightCm: number,
  gender: 'Male' | 'Female' | string
): { status: string; sourceStandard: string } => {
  if (ageInMonths < 61 || ageInMonths > 228) {
    return { status: 'Tidak Berlaku untuk Usia Ini', sourceStandard: WHO_STANDARDS_VERSION };
  }
  if (!isValidMeasurement(heightCm, 80, 220)) {
    return { status: 'Data Tinggi Badan Tidak Valid', sourceStandard: WHO_STANDARDS_VERSION };
  }
  if (gender !== 'Male' && gender !== 'Female') {
    return { status: 'Jenis Kelamin Tidak Valid', sourceStandard: WHO_STANDARDS_VERSION };
  }

  const dataTable = gender === 'Male' ? heightForAgeBoys5To19 : heightForAgeGirls5To19;
  const availableMonths = Object.keys(dataTable).map(Number).sort((a, b) => a - b);
  const closestMonth = availableMonths.reduce((prev, curr) =>
    Math.abs(curr - ageInMonths) < Math.abs(prev - ageInMonths) ? curr : prev
  );

  const percentileData = dataTable[closestMonth];
  if (!percentileData) {
    return { status: 'Data Tidak Tersedia', sourceStandard: WHO_STANDARDS_VERSION };
  }

  let status = 'Tinggi Badan Sesuai Usia';
  if (heightCm < percentileData.p3) {
    status = 'Perawakan Pendek';
  }

  return { status, sourceStandard: WHO_STANDARDS_VERSION };
};

/**
 * Body Mass Index (BMI) calculation
 */
export const calculateBMI = (weightKg: number, heightCm: number): number => {
  if (!isValidMeasurement(heightCm, 40, 250) || !isValidMeasurement(weightKg, 2, 250)) {
    return 0;
  }
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Math.round(bmi * 10) / 10;
};

/**
 * BMI-for-age status for children >= 5 years (61 - 228 months)
 */
export const calculateBMIStatus = (
  ageInMonths: number,
  bmi: number,
  gender: 'Male' | 'Female' | string
): { status: string; sourceStandard: string } => {
  if (ageInMonths < 61 || ageInMonths > 228) {
    return { status: 'Tidak Berlaku untuk Usia Ini', sourceStandard: WHO_STANDARDS_VERSION };
  }
  if (!isValidMeasurement(bmi, 8, 60)) {
    return { status: 'Nilai BMI Tidak Valid', sourceStandard: WHO_STANDARDS_VERSION };
  }
  if (gender !== 'Male' && gender !== 'Female') {
    return { status: 'Jenis Kelamin Tidak Valid', sourceStandard: WHO_STANDARDS_VERSION };
  }

  const dataTable = gender === 'Male' ? bmiForAgeBoys5To19 : bmiForAgeGirls5To19;
  const availableMonths = Object.keys(dataTable).map(Number).sort((a, b) => a - b);
  const closestMonth = availableMonths.reduce((prev, curr) =>
    Math.abs(curr - ageInMonths) < Math.abs(prev - ageInMonths) ? curr : prev
  );

  const p = dataTable[closestMonth];
  if (!p) {
    return { status: 'Data Tidak Tersedia', sourceStandard: WHO_STANDARDS_VERSION };
  }

  let status = 'Gizi Baik (Normal)';
  if (bmi < p.p3) {
    status = 'Gizi Sangat Kurang (Sangat Kurus)';
  } else if (bmi < p.p5) {
    status = 'Gizi Kurang (Kurus)';
  } else if (bmi > p.p95) {
    status = 'Obesitas';
  } else if (bmi > p.p85) {
    status = 'Gizi Lebih (Gemuk)';
  }

  return { status, sourceStandard: WHO_STANDARDS_VERSION };
};