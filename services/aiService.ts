/**
 * Frontend AI Service (calls backend /api/ai endpoints powered by Agnes AI)
 */

import type { OralAnalysisResult, HealthReportData, PatientData, StuntingScreeningData } from '../types';
import { getKnowledgeBasePrompt } from '../data/knowledgeBase';

export interface QualityCheckResult {
  quality: 'good' | 'poor' | 'unable_to_assess';
  reason: string;
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
export const checkImageQuality = async (imageFile: File): Promise<QualityCheckResult> => {
  try {
    validateImageFile(imageFile);
    const imageBase64 = await fileToBase64(imageFile);

    const response = await fetch('/api/ai/check-quality', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        imageBase64,
        mimeType: imageFile.type || 'image/jpeg',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        quality: 'unable_to_assess',
        reason: errorData.reason || errorData.error || 'Pemeriksaan kualitas gambar dari server tidak dapat diselesaikan.',
      };
    }

    const data = await response.json();
    return {
      quality: data.quality || 'unable_to_assess',
      reason: data.reason || 'Kualitas gambar dievaluasi.',
    };
  } catch (error: any) {
    console.warn('Failed to check image quality:', error);
    return {
      quality: 'unable_to_assess',
      reason: error?.message || 'Gagal mengevaluasi kualitas foto. Pastikan koneksi stabil.',
    };
  }
};

/**
 * Analyzes oral image using Agnes AI
 */
export const analyzeOralImageWithBoundingBox = async (
  imageFile: File,
  ageInYears: number
): Promise<OralAnalysisResult> => {
  validateImageFile(imageFile);
  const imageBase64 = await fileToBase64(imageFile);
  const knowledgeBase = getKnowledgeBasePrompt();

  const response = await fetch('/api/ai/analyze-oral', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      imageBase64,
      mimeType: imageFile.type || 'image/jpeg',
      ageInYears,
      knowledgeBase,
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
  oralResults: { diseaseName: string }[][],
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
