/**
 * Labeled Clinical Evaluation Benchmark Dataset for Pediatric Dental Detection
 * Curated reference standards with simulated de-identified patient-level splits.
 */

import { ToothViewType, ImageAssessability } from '../types';

export interface GroundTruthLesion {
  condition: string;
  whoCode: string;
  icd10CmCode: string;
  isCavitated: boolean;
  isStainOnly: boolean;
  isPulpInvolved: boolean;
  targetSurface: string;
  expectedBoundingBox: { x: number; y: number; width: number; height: number } | null;
}

export interface ClinicalEvaluationCase {
  caseId: string;
  patientId: string; // Used for patient-level split (no data leakage)
  ageYears: number;
  dentitionType: 'primary' | 'mixed' | 'permanent';
  viewType: ToothViewType;
  imageCharacteristics: {
    isOralCavity: boolean;
    teethVisible: boolean;
    hasSevereBlur: boolean;
    hasSevereGlare: boolean;
    hasSevereDarkness: boolean;
    hasHeavyObstruction: boolean;
  };
  expectedAssessability: ImageAssessability;
  expectedTeethVisible: boolean;
  groundTruthLesions: GroundTruthLesion[];
  triPlaqueGelConfirmed?: boolean;
  dentistConsensusNotes: string;
}

export const CLINICAL_EVALUATION_BENCHMARK: ClinicalEvaluationCase[] = [
  // ------------------------------------------------------------------------
  // PATIENT A: Normal Healthy Dentition (Primary & Mixed)
  // ------------------------------------------------------------------------
  {
    caseId: 'CASE_001_HEALTHY_FRONT',
    patientId: 'PT_ALICE_4YO',
    ageYears: 4,
    dentitionType: 'primary',
    viewType: 'FRONT_VIEW',
    imageCharacteristics: {
      isOralCavity: true,
      teethVisible: true,
      hasSevereBlur: false,
      hasSevereGlare: false,
      hasSevereDarkness: false,
      hasHeavyObstruction: false,
    },
    expectedAssessability: 'ASSESSABLE',
    expectedTeethVisible: true,
    groundTruthLesions: [],
    dentistConsensusNotes: 'Gigi sulung lengkap, tidak ada karies visual, gingiva merah muda sehat berstippling.',
  },
  {
    caseId: 'CASE_002_HEALTHY_OCCLUSAL',
    patientId: 'PT_ALICE_4YO',
    ageYears: 4,
    dentitionType: 'primary',
    viewType: 'UPPER_OCCLUSAL',
    imageCharacteristics: {
      isOralCavity: true,
      teethVisible: true,
      hasSevereBlur: false,
      hasSevereGlare: false,
      hasSevereDarkness: false,
      hasHeavyObstruction: false,
    },
    expectedAssessability: 'ASSESSABLE',
    expectedTeethVisible: true,
    groundTruthLesions: [],
    dentistConsensusNotes: 'Molar sulung oklusal utuh, fisura dangkal tanpa noda atau karies.',
  },

  // ------------------------------------------------------------------------
  // PATIENT B: Non-Oral Image Artifacts (Must Be 100% Rejected)
  // ------------------------------------------------------------------------
  {
    caseId: 'CASE_003_NON_ORAL_HAND',
    patientId: 'PT_NON_ORAL_01',
    ageYears: 3,
    dentitionType: 'primary',
    viewType: 'FRONT_VIEW',
    imageCharacteristics: {
      isOralCavity: false,
      teethVisible: false,
      hasSevereBlur: false,
      hasSevereGlare: false,
      hasSevereDarkness: false,
      hasHeavyObstruction: false,
    },
    expectedAssessability: 'UNASSESSABLE',
    expectedTeethVisible: false,
    groundTruthLesions: [],
    dentistConsensusNotes: 'Foto telapak tangan anak. Bukan foto rongga mulut. Wajib ditolak sistem.',
  },
  {
    caseId: 'CASE_004_NON_ORAL_TOY',
    patientId: 'PT_NON_ORAL_02',
    ageYears: 5,
    dentitionType: 'mixed',
    viewType: 'GENERAL_VIEW',
    imageCharacteristics: {
      isOralCavity: false,
      teethVisible: false,
      hasSevereBlur: false,
      hasSevereGlare: false,
      hasSevereDarkness: false,
      hasHeavyObstruction: false,
    },
    expectedAssessability: 'UNASSESSABLE',
    expectedTeethVisible: false,
    groundTruthLesions: [],
    dentistConsensusNotes: 'Foto mainan di posyandu. Wajib ditolak.',
  },

  // ------------------------------------------------------------------------
  // PATIENT C: Severe Image Degradation (Blur & Dark)
  // ------------------------------------------------------------------------
  {
    caseId: 'CASE_005_SEVERE_BLUR',
    patientId: 'PT_BLUR_01',
    ageYears: 2,
    dentitionType: 'primary',
    viewType: 'FRONT_VIEW',
    imageCharacteristics: {
      isOralCavity: true,
      teethVisible: true,
      hasSevereBlur: true,
      hasSevereGlare: false,
      hasSevereDarkness: false,
      hasHeavyObstruction: false,
    },
    expectedAssessability: 'UNASSESSABLE',
    expectedTeethVisible: true,
    groundTruthLesions: [],
    dentistConsensusNotes: 'Gerakan anak membuat foto buram total. Tidak dapat dinilai.',
  },
  {
    caseId: 'CASE_006_EXTREME_DARKNESS',
    patientId: 'PT_DARK_01',
    ageYears: 3,
    dentitionType: 'primary',
    viewType: 'LOWER_OCCLUSAL',
    imageCharacteristics: {
      isOralCavity: true,
      teethVisible: false,
      hasSevereBlur: false,
      hasSevereGlare: false,
      hasSevereDarkness: true,
      hasHeavyObstruction: false,
    },
    expectedAssessability: 'UNASSESSABLE',
    expectedTeethVisible: false,
    groundTruthLesions: [],
    dentistConsensusNotes: 'Foto rongga mulut gelap tanpa lampu kilat. Gigi tidak terlihat.',
  },

  // ------------------------------------------------------------------------
  // PATIENT D: Enamel White Spot Lesions (ICDAS 1-2, WHO K02.0)
  // ------------------------------------------------------------------------
  {
    caseId: 'CASE_007_WHITE_SPOT_LESION',
    patientId: 'PT_BOB_3YO',
    ageYears: 3,
    dentitionType: 'primary',
    viewType: 'FRONT_VIEW',
    imageCharacteristics: {
      isOralCavity: true,
      teethVisible: true,
      hasSevereBlur: false,
      hasSevereGlare: false,
      hasSevereDarkness: false,
      hasHeavyObstruction: false,
    },
    expectedAssessability: 'ASSESSABLE',
    expectedTeethVisible: true,
    groundTruthLesions: [
      {
        condition: 'Caries limited to enamel (White spot lesion)',
        whoCode: 'K02.0',
        icd10CmCode: 'K02.61',
        isCavitated: false,
        isStainOnly: false,
        isPulpInvolved: false,
        targetSurface: 'Labial servikal insisivus rahang atas 51 & 61',
        expectedBoundingBox: { x: 35, y: 30, width: 28, height: 22 },
      },
    ],
    dentistConsensusNotes: 'Bercak putih kapur servikal insisivus sentral rahang atas, demineralisasi awal enamel.',
  },

  // ------------------------------------------------------------------------
  // PATIENT E: Cavitated Dentin Caries (ICDAS 5-6, WHO K02.1)
  // ------------------------------------------------------------------------
  {
    caseId: 'CASE_008_CAVITATED_DENTIN_MOLAR',
    patientId: 'PT_CHARLIE_6YO',
    ageYears: 6,
    dentitionType: 'mixed',
    viewType: 'LOWER_OCCLUSAL',
    imageCharacteristics: {
      isOralCavity: true,
      teethVisible: true,
      hasSevereBlur: false,
      hasSevereGlare: false,
      hasSevereDarkness: false,
      hasHeavyObstruction: false,
    },
    expectedAssessability: 'ASSESSABLE',
    expectedTeethVisible: true,
    groundTruthLesions: [
      {
        condition: 'Caries of dentine',
        whoCode: 'K02.1',
        icd10CmCode: 'K02.52',
        isCavitated: true,
        isStainOnly: false,
        isPulpInvolved: false,
        targetSurface: 'Oklusal molar satu kanan bawah 46',
        expectedBoundingBox: { x: 20, y: 40, width: 25, height: 25 },
      },
    ],
    dentistConsensusNotes: 'Kavitas fisik nyata pada alur oklusal molar satu bawah dengan dasar dentin kecokelatan terpapar.',
  },

  // ------------------------------------------------------------------------
  // PATIENT F: Stained But Non-Carious Teeth (Extrinsic Stain)
  // ------------------------------------------------------------------------
  {
    caseId: 'CASE_009_EXTRINSIC_STAIN',
    patientId: 'PT_DAVID_7YO',
    ageYears: 7,
    dentitionType: 'mixed',
    viewType: 'UPPER_OCCLUSAL',
    imageCharacteristics: {
      isOralCavity: true,
      teethVisible: true,
      hasSevereBlur: false,
      hasSevereGlare: false,
      hasSevereDarkness: false,
      hasHeavyObstruction: false,
    },
    expectedAssessability: 'ASSESSABLE',
    expectedTeethVisible: true,
    groundTruthLesions: [
      {
        condition: 'Extrinsic staining (Non-carious)',
        whoCode: 'K02.0', // Must NOT be diagnosed as cavitated dentin caries (K02.1)!
        icd10CmCode: 'K02.51',
        isCavitated: false,
        isStainOnly: true,
        isPulpInvolved: false,
        targetSurface: 'Alur fisura molar atas',
        expectedBoundingBox: { x: 45, y: 45, width: 20, height: 20 },
      },
    ],
    dentistConsensusNotes: 'Pewarnaan kecokelatan kromogenik pada alur fisura tanpa lubang fisik. Bukan karies dentin!',
  },

  // ------------------------------------------------------------------------
  // PATIENT G: Marginal Gingival Erythema (WHO K05.1)
  // ------------------------------------------------------------------------
  {
    caseId: 'CASE_010_MARGINAL_GINGIVITIS',
    patientId: 'PT_EMMA_5YO',
    ageYears: 5,
    dentitionType: 'primary',
    viewType: 'FRONT_VIEW',
    imageCharacteristics: {
      isOralCavity: true,
      teethVisible: true,
      hasSevereBlur: false,
      hasSevereGlare: false,
      hasSevereDarkness: false,
      hasHeavyObstruction: false,
    },
    expectedAssessability: 'ASSESSABLE',
    expectedTeethVisible: true,
    groundTruthLesions: [
      {
        condition: 'Chronic gingivitis (Plaque-induced marginal)',
        whoCode: 'K05.1', // NOT acute necrotizing K05.0!
        icd10CmCode: 'K05.10',
        isCavitated: false,
        isStainOnly: false,
        isPulpInvolved: false,
        targetSurface: 'Tepi gingiva servikal anterior',
        expectedBoundingBox: { x: 30, y: 55, width: 40, height: 18 },
      },
    ],
    dentistConsensusNotes: 'Eritema tepi gusi terkait plak servikal. Memerlukan edukasi sikat gigi, bukan antibiotik.',
  },

  // ------------------------------------------------------------------------
  // PATIENT H: Enamel Hypoplasia (WHO K00.4)
  // ------------------------------------------------------------------------
  {
    caseId: 'CASE_011_ENAMEL_HYPOPLASIA',
    patientId: 'PT_FAISAL_8YO',
    ageYears: 8,
    dentitionType: 'mixed',
    viewType: 'FRONT_VIEW',
    imageCharacteristics: {
      isOralCavity: true,
      teethVisible: true,
      hasSevereBlur: false,
      hasSevereGlare: false,
      hasSevereDarkness: false,
      hasHeavyObstruction: false,
    },
    expectedAssessability: 'ASSESSABLE',
    expectedTeethVisible: true,
    groundTruthLesions: [
      {
        condition: 'Enamel hypoplasia',
        whoCode: 'K00.4',
        icd10CmCode: 'K00.4',
        isCavitated: false,
        isStainOnly: false,
        isPulpInvolved: false,
        targetSurface: 'Labial insisivus sentral permanen 11 & 21',
        expectedBoundingBox: { x: 38, y: 35, width: 24, height: 18 },
      },
    ],
    dentistConsensusNotes: 'Defek kuantitatif enamel horizontal simetris pada 11 dan 21. Riwayat demam tinggi masa bayi.',
  },

  // ------------------------------------------------------------------------
  // PATIENT I: Tooth Crowding (WHO K07.3)
  // ------------------------------------------------------------------------
  {
    caseId: 'CASE_012_CROWDING',
    patientId: 'PT_GRACE_9YO',
    ageYears: 9,
    dentitionType: 'mixed',
    viewType: 'FRONT_VIEW',
    imageCharacteristics: {
      isOralCavity: true,
      teethVisible: true,
      hasSevereBlur: false,
      hasSevereGlare: false,
      hasSevereDarkness: false,
      hasHeavyObstruction: false,
    },
    expectedAssessability: 'ASSESSABLE',
    expectedTeethVisible: true,
    groundTruthLesions: [
      {
        condition: 'Anomalies of tooth position (Crowding)',
        whoCode: 'K07.3',
        icd10CmCode: 'M26.31',
        isCavitated: false,
        isStainOnly: false,
        isPulpInvolved: false,
        targetSurface: 'Lengkung anterior rahang bawah 32, 31, 41, 42',
        expectedBoundingBox: { x: 30, y: 50, width: 40, height: 25 },
      },
    ],
    dentistConsensusNotes: 'Gigi seri bawah berjejal tumpang tindih akibat diskrepansi ukuran gigi dan lengkung rahang. Bukan stunting.',
  },

  // ------------------------------------------------------------------------
  // PATIENT J: TriPlaque Disclosed Biofilm (Procedural)
  // ------------------------------------------------------------------------
  {
    caseId: 'CASE_013_TRIPLAQUE_CONFIRMED',
    patientId: 'PT_HANI_6YO',
    ageYears: 6,
    dentitionType: 'mixed',
    viewType: 'FRONT_VIEW',
    imageCharacteristics: {
      isOralCavity: true,
      teethVisible: true,
      hasSevereBlur: false,
      hasSevereGlare: false,
      hasSevereDarkness: false,
      hasHeavyObstruction: false,
    },
    expectedAssessability: 'ASSESSABLE',
    expectedTeethVisible: true,
    triPlaqueGelConfirmed: true,
    groundTruthLesions: [
      {
        condition: 'TriPlaque: Mature Biofilm (>48h)',
        whoCode: 'PROC_TP_02',
        icd10CmCode: 'PROC_TP_02',
        isCavitated: false,
        isStainOnly: false,
        isPulpInvolved: false,
        targetSurface: 'Permukaan labial servikal 51, 61 berpewarna ungu',
        expectedBoundingBox: { x: 36, y: 40, width: 26, height: 16 },
      },
    ],
    dentistConsensusNotes: 'Pewarnaan gel GC Tri Plaque ID terkonfirmasi: area ungu tua menandakan biofilm matang berumur lebih dari 48 jam.',
  },

  // ------------------------------------------------------------------------
  // PATIENT K: Partially Visible / Obstruction
  // ------------------------------------------------------------------------
  {
    caseId: 'CASE_014_PARTIAL_OBSTRUCTION',
    patientId: 'PT_ILHAM_3YO',
    ageYears: 3,
    dentitionType: 'primary',
    viewType: 'RIGHT_BUCCAL',
    imageCharacteristics: {
      isOralCavity: true,
      teethVisible: true,
      hasSevereBlur: false,
      hasSevereGlare: false,
      hasSevereDarkness: false,
      hasHeavyObstruction: true,
    },
    expectedAssessability: 'PARTIALLY_ASSESSABLE',
    expectedTeethVisible: true,
    groundTruthLesions: [],
    dentistConsensusNotes: 'Lidah anak menutupi separuh lengkung geligi kanan bawah. Area lain dapat dinilai sebagian dengan peringatan abstensi.',
  },
];
