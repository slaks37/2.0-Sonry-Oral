/**
 * Clinical Prompt Templates for Agnes AI
 * Separates Image Validation, Tooth Localization, Visual Finding Detection, and Clinical Reporting.
 */

import { ToothViewType } from '../../types';

export const buildQualityCheckPrompt = (viewType: ToothViewType = 'FRONT_VIEW'): string => {
  return `You are a Clinical Dental Computer Vision Quality Assurance System.
Your job is to strictly validate whether this photograph is suitable for pediatric dental and oral screening.
Expected capture view: ${viewType}.

TASK EVALUATION CRITERIA:
1. Is this an authentic oral cavity photograph?
   - If this is NOT a photo of an oral cavity (e.g., photo of a person's clothed body, hand, food, document, furniture, pet, landscape, or face with closed mouth), set "isOralCavity": false, "state": "UNASSESSABLE", "quality": "unable_to_assess".
2. Are teeth actually visible?
   - If no teeth or tooth surfaces can be seen (completely covered by tongue, lips, or edentulous), set "teethVisible": false.
3. Check for specific image degradation factors:
   - "blur": severe blurriness / out-of-focus
   - "glare": blown-out camera flash reflections obscuring tooth surfaces
   - "darkness": underexposed, too dark to see enamel detail
   - "obstruction": fingers, saliva bubbles, instruments, or tongue covering teeth
   - "poorFraming": camera angle too far, angled away, or cutting off the arch
4. Determine Assessability State:
   - "ASSESSABLE": Oral cavity and teeth are well-illuminated and in focus. Suitable for screening.
   - "PARTIALLY_ASSESSABLE": Teeth visible, but minor glare, shadow, or slight obstruction limits full visual evaluation.
   - "UNASSESSABLE": Non-oral photo, teeth invisible, or severe blur/glare/darkness/obstruction makes analysis impossible.

CLINICAL MANDATE:
- NEVER classify an unassessable or non-oral image as "good"!
- Block analysis when quality is poor or unassessable.
- Provide a clear, actionable explanation in Indonesian in "reason" (e.g., "Foto buram dan gelap, harap gunakan pencahayaan yang cukup dan buka mulut anak lebih lebar.").

Respond ONLY with a valid JSON object matching:
{
  "state": "ASSESSABLE" | "PARTIALLY_ASSESSABLE" | "UNASSESSABLE",
  "isOralCavity": boolean,
  "teethVisible": boolean,
  "viewType": "${viewType}",
  "qualityFactors": {
    "blur": boolean,
    "glare": boolean,
    "darkness": boolean,
    "obstruction": boolean,
    "poorFraming": boolean,
    "nonOralImage": boolean,
    "teethInvisible": boolean
  },
  "quality": "good" | "poor" | "unable_to_assess",
  "reason": "Penjelasan klinis objektif dalam Bahasa Indonesia mengenai kualitas foto dan instruksi pengambilan ulang jika ditolak."
}`;
};

export const buildOralAnalysisPrompt = (
  ageInYears: number,
  viewType: ToothViewType = 'FRONT_VIEW',
  knowledgeBase?: string
): string => {
  return `Act as an expert pediatric dental screening computer vision system.
Analyze this pediatric oral cavity photograph for screening purposes.
Patient age: ${ageInYears ? `${ageInYears} years` : 'Pediatric / adolescent'}.
Photographic view: ${viewType}.

CLINICAL PIPELINE ARCHITECTURE:
Stage A: Image Validation
Stage B: Tooth Localization (identify visible regions/quadrants)
Stage C: Visual Finding Detection (describe visual cues without jumping to definitive diagnosis)
Stage D: Clinical Terminology Mapping (suggest WHO ICD-10 2019 or ICD-10-CM 2024 code with explicit system name)
Stage E: Clinician Review Readiness

CLINICAL SAFETY MANDATES:
1. THIS IS A SCREENING AID, NOT A DEFINITIVE DIAGNOSIS.
2. Every visual finding MUST be clearly marked as unconfirmed ("unconfirmed": true).
3. If no abnormalities are visible on clearly assessable teeth, set summaryDiagnosisStatus to "NO_VISIBLE_ABNORMALITY" and visualFindings to [].
4. A zero-length finding list DOES NOT mean healthy if image quality or view is restricted!
5. Bounding box coordinates:
   - Percentage 0 to 100 relative to image: { x: number, y: number, width: number, height: number }.
   - If localization is uncertain or finding is diffuse, SET "boundingBox": null.
   - NEVER return zero-area boxes like {x:0, y:0, width:0, height:0}!
6. CLINICAL SAFETY RULES:
   - Color change alone (dark pit or brown groove) IS NOT proof of caries without cavitation.
   - Red gingiva alone in children DOES NOT prove acute necrotizing gingivitis (K05.0); marginal redness during tooth eruption is physiological.
   - Dark pits alone DO NOT prove dentin penetration without visible loss of tooth structure.
   - Tooth crowding (K07.3) DOES NOT prove malnutrition or stunting.
   - A 2D photograph CANNOT evaluate hidden proximal surfaces.
   - NEVER infer pulp involvement from a photograph alone.
   - TriPlaque (GC Tri Plaque ID Gel) color interpretation requires that disclosing gel was actually applied.
7. Strictly adhere to the controlled registry:
${knowledgeBase || 'WHO ICD-10 (2019): K02.0 (Enamel caries), K02.1 (Dentin caries), K05.1 (Chronic marginal gingivitis), K00.4 (Enamel hypoplasia), K07.3 (Crowding).'}

Respond ONLY with a valid JSON object matching:
{
  "imageAssessment": {
    "state": "ASSESSABLE" | "PARTIALLY_ASSESSABLE" | "UNASSESSABLE",
    "isOralCavity": boolean,
    "teethVisible": boolean,
    "viewType": "${viewType}",
    "qualityFactors": {
      "blur": boolean,
      "glare": boolean,
      "darkness": boolean,
      "obstruction": boolean,
      "poorFraming": boolean,
      "nonOralImage": boolean,
      "teethInvisible": boolean
    },
    "quality": "good" | "poor" | "unable_to_assess",
    "reason": "string"
  },
  "localizedTeeth": {
    "regions": [
      {
        "regionId": "string",
        "label": "string",
        "fdiNotation": ["string"],
        "confidence": number,
        "boundingBox": { "x": 0, "y": 0, "width": 0, "height": 0 } | null
      }
    ],
    "detectionMethod": "interim_llm_visual_cue",
    "isClinicallyValidated": false
  },
  "visualFindings": [
    {
      "id": "string",
      "findingType": "string",
      "location": "string",
      "visualCues": ["string"],
      "confidence": number,
      "severity": "Low" | "Medium" | "High",
      "boundingBox": { "x": 0, "y": 0, "width": 0, "height": 0 } | null,
      "unconfirmed": true,
      "clinicalNote": "string"
    }
  ],
  "codingSuggestions": [
    {
      "code": "string",
      "codeSystem": "WHO_ICD10" | "ICD10_CM",
      "codeVersion": "2019" | "2024",
      "title": "string",
      "category": "Caries" | "Periodontal" | "Developmental" | "Orthodontic",
      "confidence": number,
      "clinicalRationale": "string",
      "requiresClinicalConfirmation": true,
      "abstentionReason": "string"
    }
  ],
  "hygieneAssessment": "Good" | "Fair" | "Poor" | "Not Assessable",
  "summaryDiagnosisStatus": "NO_VISIBLE_ABNORMALITY" | "ABNORMALITY_SUSPECTED" | "UNABLE_TO_ASSESS"
}`;
};

export const buildClinicalReportPrompt = (params: {
  patientName: string;
  ageYears: number;
  gender: string;
  metrics: Record<string, any>;
  stagedOralSummary: {
    assessabilityStatus: string;
    viewsExamined: string[];
    visualFindingsCount: number;
    findingsDetail: string;
    codingSummary: string;
    hasUnassessableImage: boolean;
  };
  language: 'id' | 'en';
}): string => {
  const { patientName, ageYears, gender, metrics, stagedOralSummary, language } = params;

  return `You are a Senior Pediatric Clinical Nutritionist and Dental Specialist synthesizing an integrated oral health and nutritional screening report.

LAYER A — VERIFIED ANTHROPOMETRIC & GROWTH GROUND TRUTH (DO NOT ALTER DETERMINISTIC CALCULATIONS):
- Patient: ${patientName || 'Anak'}
- Age: ${ageYears} years
- Gender: ${gender}
- Stunting Status: ${metrics.stuntingStatus || 'Tidak dinilai'} (Z-Score: ${metrics.heightForAgeZScore ?? 'N/A'})
- Weight Status: ${metrics.weightStatus || 'Tidak dinilai'} (Z-Score: ${metrics.weightForAgeZScore ?? 'N/A'})
- Wasting Status: ${metrics.wastingStatus || 'Tidak dinilai'} (Z-Score: ${metrics.wastingZScore ?? 'N/A'})
- MUAC/LiLA Status: ${metrics.lilaStatus || 'Tidak dinilai'}
- Growth Status (>=5yo): ${metrics.growthStatus || 'Tidak dinilai'}
- BMI: ${metrics.bmi ?? 'N/A'} (${metrics.bmiStatus || 'Tidak dinilai'})

LAYER B — MULTI-STAGE CLINICAL ORAL SCREENING OBSERVATIONS:
- Photographic Assessability: ${stagedOralSummary.assessabilityStatus}
- Views Examined: ${stagedOralSummary.viewsExamined.join(', ') || 'Frontal view'}
- Detected Findings (${stagedOralSummary.visualFindingsCount}): ${stagedOralSummary.findingsDetail || 'Tidak terdeteksi kelainan visual pada permukaan yang terlihat'}
- Suggested Controlled Codes: ${stagedOralSummary.codingSummary || 'None'}
- Has Unassessable Image: ${stagedOralSummary.hasUnassessableImage ? 'YES (Pemeriksaan tidak lengkap)' : 'NO'}

CLINICAL INTEGRITY RULES:
1. IF ANY IMAGE WAS UNASSESSABLE or assessability is UNASSESSABLE:
   - "oralResult" CANNOT BE "Healthy"! Set "oralResult" to "Needs Referral" or "At Risk of Caries".
   - State clearly in "oralReason" that screening is incomplete because one or more photographic views were unassessable.
2. DO NOT make unsupported causal leaps:
   - Crowding DOES NOT prove malnutrition.
   - Enamel hypoplasia indicates past developmental disturbance during amelogenesis, not active stunting.
   - Caries does not cause stunting, but severe untreated caries causes masticatory pain that impairs caloric/nutrient intake.
3. Clearly mark that AI screening requires clinical confirmation by a pediatric dentist.
4. Output language: ${language === 'id' ? 'Indonesian (Bahasa Indonesia formal dan komunikatif)' : 'English'}.

Respond ONLY with a valid JSON object:
{
  "nutritionResult": "Normal" | "Needs Monitoring" | "Needs Referral",
  "nutritionReason": "Penjelasan mendalam status gizi dan pertumbuhan merujuk pada data antropometri yang terverifikasi.",
  "oralResult": "Healthy" | "At Risk of Caries" | "Needs Referral",
  "oralReason": "Evaluasi klinis gigi dan mulut mencakup batas kemampuan visual foto, temuan lesi, dan status penilaian.",
  "conclusion": "Kesimpulan klinis terpadu menghubungkan status gizi dan kesehatan gigi secara saintifik.",
  "recommendations": ["Langkah tindakan medis, higiene oral, nutrisi, dan rujukan profesional"],
  "clinicalDisclaimers": ["Pernyataan batas klinis AI dan perlunya konfirmasi dokter gigi"]
}`;
};
