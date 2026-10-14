/**
 * Controlled Dental Terminology Registry & Clinical Coding Standards
 * Conforms to WHO ICD-10 (2019), ICD-10-CM (2024), ICDAS II, and GC Tri Plaque ID Protocol.
 */

export type CodingSystem = 'WHO_ICD10' | 'ICD10_CM' | 'ICDAS_II' | 'PROCEDURAL';

export interface ControlledTerm {
  code: string;
  system: CodingSystem;
  systemVersion: string;
  standardTitle: string;
  category: 'Caries' | 'Periodontal' | 'Developmental' | 'Orthodontic' | 'Procedural' | 'Normal';
  clinicalDescription: string;
  visualCues: string[];
  eligibleToothSurfaces: string[];
  severity: 'None' | 'Low' | 'Medium' | 'High';
  requiresTactileOrRadiographic: boolean;
  abstentionRules: string[];
}

/**
 * Authoritative Registry of Dental Diagnostic & Procedural Codes.
 * AI models are strictly constrained to this dictionary.
 */
export const CONTROLLED_TERMINOLOGY_REGISTRY: Record<string, ControlledTerm> = {
  // -------------------------------------------------------------
  // WHO ICD-10 (2019 Release)
  // -------------------------------------------------------------
  'WHO:K02.0': {
    code: 'K02.0',
    system: 'WHO_ICD10',
    systemVersion: '2019',
    standardTitle: 'Caries limited to enamel (White spot lesion)',
    category: 'Caries',
    clinicalDescription: 'Initial non-cavitated demineralization of tooth enamel without dentin exposure.',
    visualCues: ['Chalky white opaque spots', 'Loss of enamel translucency without macroscopic cavitation', 'Micro-roughness'],
    eligibleToothSurfaces: ['Occlusal pits and fissures', 'Smooth buccal/labial surfaces', 'Cervical third'],
    severity: 'Low',
    requiresTactileOrRadiographic: false,
    abstentionRules: [
      'Abstain if white appearance is diffuse, generalized, or symmetric across contralateral teeth (suspect fluorosis K00.3 or hypoplasia K00.4).',
      'Abstain if tooth surface was not dried or is obscured by saliva glare.',
    ],
  },
  'WHO:K02.1': {
    code: 'K02.1',
    system: 'WHO_ICD10',
    systemVersion: '2019',
    standardTitle: 'Caries of dentine',
    category: 'Caries',
    clinicalDescription: 'Carious lesion penetrating the enamel-dentin junction with visible cavity and exposed yellow/brown dentin.',
    visualCues: ['Distinct physical cavitation or hole', 'Underlying dark shadow beneath enamel', 'Exposed yellow-brown softened dentin'],
    eligibleToothSurfaces: ['Occlusal pits/grooves', 'Smooth surfaces', 'Proximal surfaces with marginal breakdown'],
    severity: 'Medium',
    requiresTactileOrRadiographic: false,
    abstentionRules: [
      'Abstain from dentin caries diagnosis if dark discoloration is superficial without structural cavitation (extrinsic stain).',
      'Abstain if lesion depth cannot be visualized and shadow is absent.',
    ],
  },
  'WHO:K02.3': {
    code: 'K02.3',
    system: 'WHO_ICD10',
    systemVersion: '2019',
    standardTitle: 'Arrested dental caries',
    category: 'Caries',
    clinicalDescription: 'Previously active carious lesion that has remineralized; hard, dark brown/black surface without progression.',
    visualCues: ['Dark brown or black shiny surface', 'Smooth polished texture upon visual inspection', 'No active cavitation spreading'],
    eligibleToothSurfaces: ['Open surfaces', 'Exposed root surfaces', 'Fissures'],
    severity: 'Low',
    requiresTactileOrRadiographic: true,
    abstentionRules: ['Requires clinical tactile assessment to verify surface hardness; visual alone is provisional.'],
  },
  'WHO:K02.9': {
    code: 'K02.9',
    system: 'WHO_ICD10',
    systemVersion: '2019',
    standardTitle: 'Dental caries, unspecified',
    category: 'Caries',
    clinicalDescription: 'Dental caries identified during visual screening where surface or depth cannot be fully delineated.',
    visualCues: ['Carious defect observed but specific depth or surface is ambiguous due to photograph angle'],
    eligibleToothSurfaces: ['Any tooth surface'],
    severity: 'Medium',
    requiresTactileOrRadiographic: true,
    abstentionRules: ['Assigned only when screening confirms caries presence but depth is uncertain.'],
  },
  'WHO:K05.1': {
    code: 'K05.1',
    system: 'WHO_ICD10',
    systemVersion: '2019',
    standardTitle: 'Chronic gingivitis (Plaque-induced marginal gingivitis)',
    category: 'Periodontal',
    clinicalDescription: 'Plaque-induced inflammation of the marginal gingiva and interdental papilla without attachment loss.',
    visualCues: ['Erythematous (red) marginal gingiva', 'Edematous or rounded gingival margins', 'Loss of stippling and glazed appearance'],
    eligibleToothSurfaces: ['Gingival margin', 'Interdental papillae'],
    severity: 'Medium',
    requiresTactileOrRadiographic: false,
    abstentionRules: [
      'DO NOT diagnose acute gingivitis (K05.0) solely from pediatric red gums. Physiological marginal hyperemia during tooth eruption is normal.',
      'Abstain if erythema is localized strictly to a tooth currently erupting.',
    ],
  },
  'WHO:K00.4': {
    code: 'K00.4',
    system: 'WHO_ICD10',
    systemVersion: '2019',
    standardTitle: 'Disturbances in tooth formation (Enamel hypoplasia)',
    category: 'Developmental',
    clinicalDescription: 'Developmental enamel defect characterized by quantitative deficiency: grooves, pits, or missing enamel bands formed during odontogenesis.',
    visualCues: ['Horizontal linear grooves or pits', 'Step-defect in enamel thickness', 'Yellowish/brownish transverse bands with distinct borders'],
    eligibleToothSurfaces: ['Labial/buccal surfaces of incisors, canines, and first permanent molars'],
    severity: 'Medium',
    requiresTactileOrRadiographic: false,
    abstentionRules: [
      'Do not infer a specific nutritional deficiency (e.g. stunting cause) from enamel hypoplasia alone without chronological history.',
      'Differentiate from post-eruptive caries or dental trauma.',
    ],
  },
  'WHO:K00.3': {
    code: 'K00.3',
    system: 'WHO_ICD10',
    systemVersion: '2019',
    standardTitle: 'Mottled teeth (Dental fluorosis)',
    category: 'Developmental',
    clinicalDescription: 'Enamel opacity caused by excessive fluoride ingestion during tooth development; diffuse, bilateral, and symmetric.',
    visualCues: ['Diffuse white paper-like horizontal striations', 'Snow capping of cusps or incisal edges', 'Bilateral homologous tooth involvement'],
    eligibleToothSurfaces: ['Homologous bilateral teeth'],
    severity: 'Low',
    requiresTactileOrRadiographic: false,
    abstentionRules: ['Do not diagnose fluorosis if lesion is isolated to a single non-homologous tooth (suspect hypoplasia K00.4 or caries K02.0).'],
  },
  'WHO:K07.3': {
    code: 'K07.3',
    system: 'WHO_ICD10',
    systemVersion: '2019',
    standardTitle: 'Anomalies of tooth position (Crowding, spacing, rotation)',
    category: 'Orthodontic',
    clinicalDescription: 'Discrepancy between tooth size and arch length resulting in overlapping, tilted, or malpositioned teeth.',
    visualCues: ['Overlapping incisors or canines', 'Rotated teeth', 'Ectopic eruption trajectory'],
    eligibleToothSurfaces: ['Dental arch alignment'],
    severity: 'Low',
    requiresTactileOrRadiographic: false,
    abstentionRules: [
      'Crowding DOES NOT prove malnutrition or stunted growth. Tooth size and jaw dimensions have genetic and developmental factors.',
    ],
  },

  // -------------------------------------------------------------
  // ICD-10-CM (2024 Clinical Modification)
  // -------------------------------------------------------------
  'ICD10CM:K02.51': {
    code: 'K02.51',
    system: 'ICD10_CM',
    systemVersion: '2024',
    standardTitle: 'Dental caries on pit and fissure surface, limited to enamel',
    category: 'Caries',
    clinicalDescription: 'Initial caries confined to pit and fissure enamel of posterior teeth without dentinal cavitation.',
    visualCues: ['Opaque white halo around occlusal fissures', 'Brownish micro-fissure discoloration without cavitation'],
    eligibleToothSurfaces: ['Occlusal pits and fissures of molars and premolars'],
    severity: 'Low',
    requiresTactileOrRadiographic: false,
    abstentionRules: ['Do not confuse with WHO K02.0. In US ICD-10-CM this is specific to pit/fissure surfaces.'],
  },
  'ICD10CM:K02.52': {
    code: 'K02.52',
    system: 'ICD10_CM',
    systemVersion: '2024',
    standardTitle: 'Dental caries on pit and fissure surface, penetrating into dentin',
    category: 'Caries',
    clinicalDescription: 'Cavitated caries on pit and fissure surface extending into underlying dentin.',
    visualCues: ['Disrupted fissure anatomy with visible cavitation into yellow-brown dentin', 'Dark grey shadow undermining occlusal marginal ridge'],
    eligibleToothSurfaces: ['Occlusal surface of molars and premolars'],
    severity: 'Medium',
    requiresTactileOrRadiographic: false,
    abstentionRules: ['Do not assign without clear physical cavitation or dentinal shadow.'],
  },
  'ICD10CM:K02.61': {
    code: 'K02.61',
    system: 'ICD10_CM',
    systemVersion: '2024',
    standardTitle: 'Dental caries on smooth surface, limited to enamel',
    category: 'Caries',
    clinicalDescription: 'Initial non-cavitated caries located on cervical or smooth facial/lingual tooth surfaces.',
    visualCues: ['Chalky crescent-shaped white lesion along the gingival margin', 'Enamel surface roughness on facial/lingual surface'],
    eligibleToothSurfaces: ['Buccal, labial, lingual cervical margin'],
    severity: 'Low',
    requiresTactileOrRadiographic: false,
    abstentionRules: ['Must be differentiated from plaque accumulation or calculus by proper visual inspection.'],
  },
  'ICD10CM:K02.62': {
    code: 'K02.62',
    system: 'ICD10_CM',
    systemVersion: '2024',
    standardTitle: 'Dental caries on smooth surface, penetrating into dentin',
    category: 'Caries',
    clinicalDescription: 'Cavitated caries on smooth buccal, labial, or lingual surface penetrating through enamel into dentin.',
    visualCues: ['Definite hole or cavitation along the cervical margin or smooth surface exposing dentin'],
    eligibleToothSurfaces: ['Smooth surfaces of anterior or posterior teeth'],
    severity: 'Medium',
    requiresTactileOrRadiographic: false,
    abstentionRules: ['Requires definite cavitation; staining alone is insufficient.'],
  },

  // -------------------------------------------------------------
  // GC Tri Plaque ID Gel Procedural Findings
  // -------------------------------------------------------------
  'PROC:TP.01': {
    code: 'PROC_TP_01',
    system: 'PROCEDURAL',
    systemVersion: 'GC_TriPlaque_V1',
    standardTitle: 'TriPlaque Procedural: Immature Biofilm (< 48 hours)',
    category: 'Procedural',
    clinicalDescription: 'GC Tri Plaque ID Gel disclosing test showing thin, newly formed biofilm stained pink or red.',
    visualCues: ['Distinct bright pink or red stain on tooth surface after gel application and rinsing'],
    eligibleToothSurfaces: ['Cervical margins', 'Smooth surfaces'],
    severity: 'Low',
    requiresTactileOrRadiographic: false,
    abstentionRules: [
      'MANDATORY: Requires explicit user/operator confirmation that GC Tri Plaque ID Gel protocol was applied.',
      'DO NOT interpret natural mucosal redness or lipstick as TriPlaque pink staining.',
    ],
  },
  'PROC:TP.02': {
    code: 'PROC_TP_02',
    system: 'PROCEDURAL',
    systemVersion: 'GC_TriPlaque_V1',
    standardTitle: 'TriPlaque Procedural: Mature Biofilm (> 48 hours)',
    category: 'Procedural',
    clinicalDescription: 'GC Tri Plaque ID Gel disclosing test showing thick, mature structured biofilm stained purple or dark blue.',
    visualCues: ['Distinct purple or deep dark blue stain on tooth surface after gel application and rinsing'],
    eligibleToothSurfaces: ['Interproximal margins', 'Deep fissures', 'Cervical third'],
    severity: 'Medium',
    requiresTactileOrRadiographic: false,
    abstentionRules: [
      'Requires verified application of GC Tri Plaque ID disclosing gel.',
      'Do not confuse with amalgam tattoo or exogenous food stain (blueberries).',
    ],
  },
  'PROC:TP.03': {
    code: 'PROC_TP_03',
    system: 'PROCEDURAL',
    systemVersion: 'GC_TriPlaque_V1',
    standardTitle: 'TriPlaque Procedural: High Acid-Producing Biofilm (pH <= 4.5)',
    category: 'Procedural',
    clinicalDescription: 'GC Tri Plaque ID Gel disclosing test showing acidogenic cariogenic biofilm stained light blue or cyan.',
    visualCues: ['Distinct light blue or cyan stain indicating local acid production below critical pH 4.5'],
    eligibleToothSurfaces: ['Active caries margins', 'Plaque stagnation areas'],
    severity: 'High',
    requiresTactileOrRadiographic: false,
    abstentionRules: [
      'Requires verified application of GC Tri Plaque ID disclosing gel.',
    ],
  },
};

/**
 * Validates a code against the controlled registry.
 * Rejects hallucinated or unauthorized disease codes.
 */
export const lookupControlledTerm = (rawCode: string, preferredSystem: CodingSystem = 'WHO_ICD10'): ControlledTerm | null => {
  const normalized = rawCode.trim();

  // Try direct lookup
  if (CONTROLLED_TERMINOLOGY_REGISTRY[normalized]) {
    return CONTROLLED_TERMINOLOGY_REGISTRY[normalized];
  }

  // Try prefixed lookup
  const candidates = [
    `WHO:${normalized}`,
    `ICD10CM:${normalized}`,
    `PROC:${normalized}`,
  ];

  for (const candidate of candidates) {
    if (CONTROLLED_TERMINOLOGY_REGISTRY[candidate]) {
      return CONTROLLED_TERMINOLOGY_REGISTRY[candidate];
    }
  }

  // Scan by matching code property
  const matches = Object.values(CONTROLLED_TERMINOLOGY_REGISTRY).filter(
    (t) => t.code.toLowerCase() === normalized.toLowerCase()
  );

  if (matches.length === 1) {
    return matches[0];
  }

  if (matches.length > 1) {
    // Prefer user preferred system
    const systemMatch = matches.find((m) => m.system === preferredSystem);
    return systemMatch || matches[0];
  }

  return null;
};
