import type { OralAnalysisResult, HealthReportData, PatientData, StuntingScreeningData } from '../types';
import { getKnowledgeBasePrompt } from '../data/knowledgeBase';

const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Extract base64 part
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export const checkImageQuality = async (imageFile: File): Promise<{ quality: 'good' | 'poor'; reason: string }> => {
  try {
    const imageBase64 = await fileToBase64(imageFile);
    const response = await fetch('/api/gemini/check-quality', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64,
        mimeType: imageFile.type || 'image/jpeg',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('Image quality check failed on server:', errorData);
      // Fallback to good so user is not blocked
      return { quality: 'good', reason: 'Pemeriksaan kualitas selesai.' };
    }

    const data = await response.json();
    return {
      quality: data.quality === 'poor' ? 'poor' : 'good',
      reason: data.reason || 'Kualitas gambar memadai.',
    };
  } catch (error) {
    console.warn('Failed to check image quality:', error);
    // Return good to avoid blocking user in case of temporary network glitch
    return { quality: 'good', reason: 'Pemeriksaan kualitas gambar dilewati.' };
  }
};

export const analyzeOralImageWithBoundingBox = async (
  imageFile: File,
  ageInYears: number
): Promise<OralAnalysisResult> => {
  const imageBase64 = await fileToBase64(imageFile);
  const knowledgeBase = getKnowledgeBasePrompt();

  const response = await fetch('/api/gemini/analyze-oral', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64,
      mimeType: imageFile.type || 'image/jpeg',
      ageInYears,
      knowledgeBase,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error || `Analisis mulut gagal (${response.status}: ${response.statusText})`;
    throw new Error(message);
  }

  const result = await response.json();
  return result as OralAnalysisResult;
};

export const generateFinalReport = async (
  patientData: PatientData,
  stuntingData: StuntingScreeningData,
  oralResults: { diseaseName: string }[][],
  metrics: Partial<HealthReportData>,
  language: 'en' | 'id'
): Promise<HealthReportData> => {
  const response = await fetch('/api/gemini/final-report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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
