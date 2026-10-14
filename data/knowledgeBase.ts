/**
 * Clinical Oral Knowledge Base for Sonry Oralytic AI 2.0
 * Separates visual findings, disease categories, ICDAS observations, ICD-10 coding, and TriPlaque procedures.
 */

import { CONTROLLED_TERMINOLOGY_REGISTRY, ControlledTerm, lookupControlledTerm } from './dentalTerminology';

export interface VisualFindingDefinition {
  id: string;
  name: string;
  visualCues: string[];
  eligibleLocations: string[];
  differentialDiagnoses: string[];
  requiresClinicalTactile: boolean;
  icdasMapping?: string;
  primaryIcdSuggestion: string;
}

export interface ICDASObservation {
  score: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  code: string;
  definition: string;
  visualCharacteristics: string;
  clinicalAction: string;
}

/**
 * Stage C: Visual Finding Definitions
 */
export const VISUAL_FINDINGS_REGISTRY: VisualFindingDefinition[] = [
  {
    id: 'VF_WHITE_SPOT',
    name: 'Opasitas Enamel Non-Kavitas (White Spot Lesion)',
    visualCues: ['Bercak putih kapur (chalky white)', 'Kehilangan translusen enamel tanpa lubang fisik', 'Opasitas berbatas jelas'],
    eligibleLocations: ['Permukaan oklusal molar', 'Permukaan bukal servikal gigi anterior & posterior'],
    differentialDiagnoses: ['Fluorosis enamel (K00.3)', 'Hipoplasia enamel (K00.4)', 'Akumulasi plak/biofilm'],
    requiresClinicalTactile: false,
    icdasMapping: 'ICDAS 1-2',
    primaryIcdSuggestion: 'WHO:K02.0',
  },
  {
    id: 'VF_CAVITY_DENTIN',
    name: 'Kavitas Aktif Menembus Dentin (Cavitated Dentin Caries)',
    visualCues: ['Lubang/kavitas fisik yang nyata pada permukaan gigi', 'Bayangan gelap di bawah enamel', 'Dentin lunak kecokelatan/kekuningan terpapar'],
    eligibleLocations: ['Fisura oklusal molar/premolar', 'Permukaan aproksimal dengan kerusakan marginal ridge', 'Servikal'],
    differentialDiagnoses: ['Karies terhenti/arrested caries (K02.3)', 'Restorasi lama rusak', 'Fraktur mahkota'],
    requiresClinicalTactile: false,
    icdasMapping: 'ICDAS 5-6',
    primaryIcdSuggestion: 'WHO:K02.1',
  },
  {
    id: 'VF_EXTRINSIC_STAIN',
    name: 'Pewarnaan Ekstrinsik Non-Karies (Extrinsic Surface Staining)',
    visualCues: ['Garis hitam/cokelat di sepanjang alur fisura tanpa hilangnya struktur enamel', 'Permukaan halus mengkilap tanpa bayangan dentin'],
    eligibleLocations: ['Alur dan fisura oklusal molar', 'Permukaan lingual/palatal'],
    differentialDiagnoses: ['Karies fisura inisial (K02.0)', 'Karies terhenti (K02.3)'],
    requiresClinicalTactile: true,
    icdasMapping: 'ICDAS 0',
    primaryIcdSuggestion: 'NORMAL_STAIN',
  },
  {
    id: 'VF_GINGIVAL_ERYTHEMA',
    name: 'Eritema Tepi Gingiva (Marginal Gingival Erythema)',
    visualCues: ['Kemerahan mencolok pada tepi gusi (marginal)', 'Pembengkakan ringan pada papila interdental', 'Permukaan licin mengkilap'],
    eligibleLocations: ['Tepi gusi servikal', 'Papila interdental'],
    differentialDiagnoses: ['Hiperemia fisiologis erupsi gigi pada anak', 'Trauma mekanik sikat gigi', 'Gingivitis kronis plak (K05.1)'],
    requiresClinicalTactile: false,
    primaryIcdSuggestion: 'WHO:K05.1',
  },
  {
    id: 'VF_ENAMEL_HYPOPLASIA',
    name: 'Defek Perkembangan Enamel / Hipoplasia (Enamel Hypoplasia)',
    visualCues: ['Alur atau cekungan horizontal teratur', 'Pita kecokelatan berbatas tegas akibat defisiensi kuantitatif saat odontogenesis', 'Hilangnya sebagian lapisan enamel teratur'],
    eligibleLocations: ['Permukaan labial insisivus', 'Permukaan bukal molar satu permanen'],
    differentialDiagnoses: ['Karies servikal', 'Fluorosis (K00.3)', 'Amelogenesis imperfekta'],
    requiresClinicalTactile: false,
    primaryIcdSuggestion: 'WHO:K00.4',
  },
  {
    id: 'VF_CROWDING',
    name: 'Malposisi Gigi / Berjejal (Tooth Crowding / Malposition)',
    visualCues: ['Gigi saling tumpang tindih (overlapping)', 'Rotasi aksial gigi', 'Penyempitan lengkung geligi'],
    eligibleLocations: ['Gigi anterior rahang bawah & rahang atas'],
    differentialDiagnoses: ['Variasi anatomi normal masa geligi bercampur', 'Persistensi gigi sulung'],
    requiresClinicalTactile: false,
    primaryIcdSuggestion: 'WHO:K07.3',
  },
  {
    id: 'VF_TRIPLAQUE_PINK',
    name: 'TriPlaque: Biofilm Baru (< 48 Jam)',
    visualCues: ['Pewarnaan merah jambu / pink pada permukaan gigi setelah aplikasi gel GC Tri Plaque ID'],
    eligibleLocations: ['Area servikal gigi', 'Aproksimal'],
    differentialDiagnoses: ['Warna mukosa normal', 'Pewarna makanan'],
    requiresClinicalTactile: false,
    primaryIcdSuggestion: 'PROC:TP.01',
  },
  {
    id: 'VF_TRIPLAQUE_PURPLE',
    name: 'TriPlaque: Biofilm Matang (> 48 Jam)',
    visualCues: ['Pewarnaan ungu gelap atau biru tua pada permukaan gigi setelah aplikasi gel GC Tri Plaque ID'],
    eligibleLocations: ['Fisura dalam', 'Area servikal dan aproksimal'],
    differentialDiagnoses: ['Tato amalgam', 'Pewarna makanan'],
    requiresClinicalTactile: false,
    primaryIcdSuggestion: 'PROC:TP.02',
  },
  {
    id: 'VF_TRIPLAQUE_CYAN',
    name: 'TriPlaque: Biofilm Asam Risiko Tinggi (pH <= 4.5)',
    visualCues: ['Pewarnaan biru muda / cyan terang pada permukaan gigi setelah aplikasi gel GC Tri Plaque ID'],
    eligibleLocations: ['Tepi tumpatan', 'Area demineralisasi karies aktif'],
    differentialDiagnoses: ['Noda komposit'],
    requiresClinicalTactile: false,
    primaryIcdSuggestion: 'PROC:TP.03',
  },
];

/**
 * Standard ICDAS Caries Scoring Criteria (Reference for Clinical Dental Evaluation)
 */
export const ICDAS_REFERENCE_CRITERIA: ICDASObservation[] = [
  {
    score: 0,
    code: 'ICDAS 0',
    definition: 'Sound tooth surface',
    visualCharacteristics: 'Permukaan enamel sehat, tidak ada perubahan opasitas visual setelah pengeringan udara.',
    clinicalAction: 'Pencegahan primer rutin.',
  },
  {
    score: 1,
    code: 'ICDAS 1',
    definition: 'First visual change in enamel',
    visualCharacteristics: 'Perubahan opasitas terlihat hanya setelah pengeringan permukaan yang lama atau terbatas di dasar fisura.',
    clinicalAction: 'Aplikasi fluorida topikal, pemantauan berkala.',
  },
  {
    score: 2,
    code: 'ICDAS 2',
    definition: 'Distinct visual change in enamel',
    visualCharacteristics: 'Bercak putih atau cokelat berbatas tegas terlihat saat gigi masih basah.',
    clinicalAction: 'Remineralisasi, aplikasi varnish fluorida.',
  },
  {
    score: 3,
    code: 'ICDAS 3',
    definition: 'Localized enamel breakdown without visible dentin',
    visualCharacteristics: 'Mikrokavitas lokal pada enamel tanpa paparan dentin yang terlihat.',
    clinicalAction: 'Fissure sealant atau restorasi invasif minimal.',
  },
  {
    score: 4,
    code: 'ICDAS 4',
    definition: 'Underlying dark shadow from dentin',
    visualCharacteristics: 'Bayangan abu-abu/biru/cokelat gelap membayang dari bawah enamel yang utuh atau sedikit retak.',
    clinicalAction: 'Pemeriksaan radiografis dan preparasi restorasi.',
  },
  {
    score: 5,
    code: 'ICDAS 5',
    definition: 'Distinct cavity with visible dentin',
    visualCharacteristics: 'Kavitas fisik nyata dengan dasar dentin terlihat jelas namun kurang dari separuh permukaan.',
    clinicalAction: 'Restorasi fungsional (GIC / Komposit).',
  },
  {
    score: 6,
    code: 'ICDAS 6',
    definition: 'Extensive distinct cavity with visible dentin',
    visualCharacteristics: 'Kavitas luas mencapai lebih dari separuh permukaan mahkota dengan dentin terbuka lebar.',
    clinicalAction: 'Restorasi kompleks, pulpotomi/pulpektomi jika ada indikasi, atau pencabutan terencana.',
  },
];

/**
 * Builds the structured knowledge base prompt injected into Agnes AI.
 */
export const getKnowledgeBasePrompt = (): string => {
  const terms = Object.values(CONTROLLED_TERMINOLOGY_REGISTRY).map((term) => {
    return `- [${term.system}] **${term.code}**: ${term.standardTitle}
  * Visual Cues: ${term.visualCues.join('; ')}
  * Severity: ${term.severity}
  * Clinical Safety: ${term.abstentionRules.join(' ')}`;
  });

  return `CONTROLLED CLINICAL REGISTRY (STRICTLY USE ONLY CODES FROM THIS REGISTRY):
${terms.join('\n\n')}

ICDAS CARIES OBSERVATION SCALES:
${ICDAS_REFERENCE_CRITERIA.map((c) => `- ${c.code}: ${c.definition} (${c.visualCharacteristics})`).join('\n')}`;
};

export { CONTROLLED_TERMINOLOGY_REGISTRY, lookupControlledTerm };