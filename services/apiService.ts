import type { ScreeningRecord, PatientData } from '../types';

const EMR_API_PROXY_URL = '/api/emr/patient-records';
const API_URL = '/api/v1/screening-records';
const OFFLINE_DRAFTS_KEY = 'sonri_offline_drafts_v2';

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

const transformRecordForEMR = (record: ScreeningRecord) => {
  return {
    encounterDate: record.date,
    sourceSystem: 'Sonri Oralytic AI 2.0',
    patientIdentifier: {
      type: 'NIK',
      value: record.patientData.nik,
    },
    observations: [
      { code: 'NUTRITION_STATUS', value: record.healthReport.nutritionResult, details: record.healthReport.nutritionReason },
      { code: 'ORAL_HEALTH_STATUS', value: record.healthReport.oralResult, details: record.healthReport.oralReason },
      { code: 'STUNTING_ZSCORE', value: record.healthReport.heightForAgeZScore, unit: 'SD' },
      { code: 'BMI', value: record.healthReport.bmi, unit: 'kg/m2' },
      { code: 'CONCLUSION', value: record.healthReport.conclusion },
    ],
    notes: `Detected oral issues: ${[...new Set(record.oralAnalyses.flatMap((a) => a.analysisResult.issues.map((i) => i.diseaseName)))].join(', ') || 'None'}`,
  };
};

/**
 * Sends a screening record to the EMR system via backend proxy.
 */
export const sendRecordToEMR = async (record: ScreeningRecord): Promise<{ success: boolean; message: string }> => {
  const emrData = transformRecordForEMR(record);

  try {
    const response = await fetch(EMR_API_PROXY_URL, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(emrData),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `EMR API Error: ${response.status} ${response.statusText}`);
    }
    return { success: true, message: 'Data berhasil disinkronisasi ke EMR.' };
  } catch (error: any) {
    console.error('Failed to send record to EMR:', error);
    return { success: false, message: error?.message || 'Gagal sinkronisasi EMR' };
  }
};

/**
 * Fetches patient data from EMR by NIK within authenticated organization.
 */
export const fetchPatientDataFromEMR = async (nik: string): Promise<Partial<PatientData> | null> => {
  try {
    const response = await fetch(`${EMR_API_PROXY_URL}?nik=${encodeURIComponent(nik)}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`EMR API Error: ${response.status} ${response.statusText}`);
    }
    const emrPatientData = await response.json();
    return emrPatientData as Partial<PatientData>;
  } catch (error) {
    console.warn(`Could not fetch patient data from EMR: ${error}. Proceeding with manual entry.`);
    return null;
  }
};

/**
 * Fetches screening records from central PostgreSQL database.
 */
export const getScreeningRecords = async (searchTerm?: string): Promise<ScreeningRecord[]> => {
  const url = searchTerm ? `${API_URL}?search=${encodeURIComponent(searchTerm)}` : API_URL;
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Gagal mengambil data dari database server (${response.status})`);
  }

  return response.json();
};

/**
 * Saves a screening record to central Neon PostgreSQL.
 * NEVER suppresses database failure or returns false success!
 */
export const saveScreeningRecord = async (record: ScreeningRecord): Promise<void> => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(record),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData.error || `Database error (${response.status}: ${response.statusText})`;

    // Save to explicit offline draft queue so posyandu health worker doesn't lose data
    try {
      const existingDrafts: ScreeningRecord[] = JSON.parse(localStorage.getItem(OFFLINE_DRAFTS_KEY) || '[]');
      existingDrafts.push({
        ...record,
        id: `DRAFT-${record.id}`,
      });
      localStorage.setItem(OFFLINE_DRAFTS_KEY, JSON.stringify(existingDrafts));
      console.warn('⚠️ Record saved to offline draft queue due to server error.');
    } catch (e) {
      console.error('Failed to save to local draft queue:', e);
    }

    throw new Error(`Gagal menyimpan ke server pusat: ${errorMsg}. Data dicatat sebagai draft lokal.`);
  }
};
