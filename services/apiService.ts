import type { ScreeningRecord, PatientData } from '../types';

const STORAGE_KEY = 'screeningRecords';

// --- HYPOTHETICAL BACKEND API ENDPOINTS ---
// This would be the endpoint on OUR server that communicates with the EMR
const EMR_API_PROXY_URL = '/api/emr/patient-records'; 
const API_URL = '/api/v1/screening-records';


// ===================================================================================
// EMR INTEGRATION - PART 1: Pushing Data to the EMR
// ===================================================================================

/**
 * Transforms our app's ScreeningRecord into a simplified format
 * that a hypothetical EMR might expect.
 * In a real-world scenario, this transformation would be more complex and
 * likely map to a standard like FHIR (Fast Healthcare Interoperability Resources).
 * This logic would live on the BACKEND.
 * @param record The ScreeningRecord from our app.
 * @returns A simplified object for the EMR.
 */
const transformRecordForEMR = (record: ScreeningRecord) => {
    // Example EMR Observation format
    return {
        encounterDate: record.date,
        sourceSystem: 'Sonri Oralytic AI',
        patientIdentifier: {
            type: 'NIK',
            value: record.patientData.nik,
        },
        observations: [
            { code: 'NUTRITION_STATUS', value: record.healthReport.nutritionResult, details: record.healthReport.nutritionReason },
            { code: 'ORAL_HEALTH_STATUS', value: record.healthReport.oralResult, details: record.healthReport.oralReason },
            { code: 'STUNTING_ZSCORE', value: record.healthReport.heightForAgeZScore, unit: 'SD' },
            { code: 'BMI', value: record.healthReport.bmi, unit: 'kg/m2' },
            { code: 'CONCLUSION', value: record.healthReport.conclusion }
        ],
        notes: `Detected oral issues: ${[...new Set(record.oralAnalyses.flatMap(a => a.analysisResult.issues.map(i => i.diseaseName)))].join(', ') || 'None'}`
    };
};

/**
 * Sends a screening record to the EMR system via our backend proxy.
 * In a real application, this would be called after a successful save.
 * @param record The screening record to send.
 */
export const sendRecordToEMR = async (record: ScreeningRecord): Promise<{ success: boolean; message: string }> => {
    console.log("Step 1: Transforming record for EMR format.");
    const emrData = transformRecordForEMR(record);

    console.log(`Step 2: Sending transformed data to our backend proxy at ${EMR_API_PROXY_URL}.`);
    // This fetch call goes to OUR backend, which then securely communicates with the EMR.
    try {
        const response = await fetch(EMR_API_PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emrData),
        });

        if (!response.ok) {
            // The backend would return a specific error from the EMR
            throw new Error(`EMR API Error: ${response.status} ${response.statusText}`);
        }
        console.log("Step 3: Data successfully received by backend for EMR processing.");
        return { success: true, message: "Record successfully sent to EMR." };
    } catch (error) {
        console.error("Failed to send record to EMR via backend:", error);
        // This simulates a network failure or an error from the EMR system.
        // We are only logging it here, but a real app might queue it for a retry.
        return { success: false, message: (error as Error).message };
    }
};


// ===================================================================================
// EMR INTEGRATION - PART 2: Pulling Data from the EMR
// ===================================================================================

/**
 * Fetches patient data from the EMR using their NIK.
 * This would be called when a user enters a NIK at the start of a screening.
 * @param nik The patient's National ID Number.
 * @returns A promise that resolves to patient data or null if not found.
 */
export const fetchPatientDataFromEMR = async (nik: string): Promise<Partial<PatientData> | null> => {
    console.log(`Querying our backend for EMR data for NIK: ${nik}`);
    try {
        const response = await fetch(`${EMR_API_PROXY_URL}?nik=${nik}`);
        if (!response.ok) {
            if (response.status === 404) {
                console.log("Patient not found in EMR.");
                return null;
            }
            throw new Error(`EMR API Error: ${response.status} ${response.statusText}`);
        }
        const emrPatientData = await response.json();

        // The backend would have transformed the EMR data into a format our frontend understands.
        console.log("Received patient data from EMR:", emrPatientData);
        return emrPatientData as Partial<PatientData>;

    } catch (error) {
        console.warn(`Could not fetch patient data from EMR: ${error}. Proceeding with manual entry.`);
        return null;
    }
};



// ===================================================================================
// EXISTING API SERVICE LOGIC (Internal App Storage)
// ===================================================================================


export const fetchScreeningRecordsFromAPI = async (apiUrl: string): Promise<ScreeningRecord[]> => {
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`API GET Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

export const saveScreeningRecordToAPI = async (apiUrl: string, record: ScreeningRecord): Promise<void> => {
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(record),
    });

    if (!response.ok) {
        throw new Error(`API POST Error: ${response.status} ${response.statusText}`);
    }
};

export const getScreeningRecords = async (): Promise<ScreeningRecord[]> => {
  console.log(`Attempting to fetch records from API: ${API_URL}...`);
  try {
    return await fetchScreeningRecordsFromAPI(API_URL);
  } catch (error) {
    console.warn(`API fetch failed (${error}). Falling back to local storage for demo purposes.`);
    try {
      const storedRecords = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Promise.resolve(storedRecords);
    } catch (e) {
      console.error("Failed to load records from localStorage", e);
      return Promise.resolve([]);
    }
  }
};

export const saveScreeningRecord = async (record: ScreeningRecord): Promise<void> => {
    console.log(`Attempting to save record via API: ${API_URL}...`);
    try {
        await saveScreeningRecordToAPI(API_URL, record);
        console.log("Record saved successfully to API.");
    } catch (error) {
        console.warn(`API save failed (${error}). Falling back to local storage for demo purposes.`);
        try {
            const existingRecords = await getScreeningRecords();
            const updatedRecords = [...existingRecords, record];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRecords));
            console.log("Record saved successfully to local storage.");
            return Promise.resolve();
        } catch (e) {
            console.error("Failed to save data to local storage:", e);
            return Promise.reject(e);
        }
    }
};
