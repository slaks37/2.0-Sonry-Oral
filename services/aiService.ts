/**
 * Frontend AI Service (calls backend /api/ai endpoints powered by Agnes AI)
 */

import type {
  OralAnalysisResult,
  HealthReportData,
  PatientData,
  StuntingScreeningData,
  ToothViewType,
  ImageAssessability,
  QualityFactors,
} from '../types';

export interface QualityCheckResult {
  state: ImageAssessability;
  isOralCavity: boolean;
  teethVisible: boolean;
  viewType: ToothViewType;
  quality: 'good' | 'poor' | 'unable_to_assess';
  reason: string;
  qualityFactors?: QualityFactors;
}

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Validates image size and MIME type on the client before network transmission.
 */
export const validateImageFile = (file: File): void => {
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`Ukuran foto terlalu besar (${Math.round(file.size / (1024 * 1024))}MB). Batas maksimal adalah 10MB.`);
  }

  const mime = file.type || 'image/jpeg';
  if (!ALLOWED_MIME_TYPES.includes(mime)) {
    throw new Error('Format gambar tidak didukung. Harap gunakan format JPEG, PNG, atau WebP.');
  }
};

const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('sonri_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

/**
 * Evaluates image quality before performing full analysis.
 * NEVER returns 'good' on error or service failure!
 */
export const checkImageQuality = async (
  imageFile: File,
  viewType: ToothViewType = 'FRONT_VIEW'
): Promise<QualityCheckResult> => {
  try {
    validateImageFile(imageFile);
    const imageBase64 = await fileToBase64(imageFile);

    const response = await fetch('/api/ai/check-quality', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        imageBase64,
        mimeType: imageFile.type || 'image/jpeg',
        viewType,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        state: 'UNASSESSABLE',
        isOralCavity: false,
        teethVisible: false,
        viewType,
        quality: 'unable_to_assess',
        reason: errorData.reason || errorData.error || 'Pemeriksaan kualitas gambar dari server tidak dapat diselesaikan.',
      };
    }

    const data = await response.json();
    return {
      state: data.state || (data.quality === 'good' ? 'ASSESSABLE' : 'UNASSESSABLE'),
      isOralCavity: data.isOralCavity ?? true,
      teethVisible: data.teethVisible ?? true,
      viewType: data.viewType || viewType,
      quality: data.quality || 'unable_to_assess',
      reason: data.reason || 'Kualitas gambar dievaluasi.',
      qualityFactors: data.qualityFactors,
    };
  } catch (error: any) {
    console.warn('Failed to check image quality:', error);
    return {
      state: 'UNASSESSABLE',
      isOralCavity: false,
      teethVisible: false,
      viewType,
      quality: 'unable_to_assess',
      reason: error?.message || 'Gagal mengevaluasi kualitas foto. Pastikan koneksi stabil dan sesi aktif.',
    };
  }
};

/**
 * Analyzes oral image using Agnes AI
 */
export const analyzeOralImageWithBoundingBox = async (
  imageFile: File,
  ageInYears: number,
  viewType: ToothViewType = 'FRONT_VIEW'
): Promise<OralAnalysisResult> => {
  validateImageFile(imageFile);
  const imageBase64 = await fileToBase64(imageFile);

  const response = await fetch('/api/ai/analyze-oral', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      imageBase64,
      mimeType: imageFile.type || 'image/jpeg',
      ageInYears,
      viewType,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error || `Analisis gigi dan mulut gagal (${response.status}: ${response.statusText})`;
    throw new Error(message);
  }

  const result = await response.json();
  return result as OralAnalysisResult;
};

/**
 * Generates synthesized clinical report
 */
export const generateFinalReport = async (
  patientData: PatientData,
  stuntingData: StuntingScreeningData,
  oralResults: any[],
  metrics: Partial<HealthReportData>,
  language: 'en' | 'id'
): Promise<HealthReportData> => {
  const response = await fetch('/api/ai/final-report', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      patientData,
      stuntingData,
      oralResults,
      metrics,
      language,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error || `Gagal menyusun laporan (${response.status}: ${response.statusText})`;
    throw new Error(message);
  }

  const result = await response.json();
  return result as HealthReportData;
};
