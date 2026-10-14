/**
 * Clinical Safety Rules Engine
 * Enforces authoritative clinical guidelines, safety boundaries, and abstention protocols.
 */

import {
  ImageAssessment,
  VisualFinding,
  CodingSuggestion,
  OralIssue,
  BoundingBox,
} from '../types';
import { lookupControlledTerm, CONTROLLED_TERMINOLOGY_REGISTRY } from '../data/dentalTerminology';

export interface ClinicalSafetyOptions {
  triPlaqueGelConfirmed?: boolean;
  preferredCodingSystem?: 'WHO_ICD10' | 'ICD10_CM';
}

export interface SanitizedAnalysisResult {
  visualFindings: VisualFinding[];
  codingSuggestions: CodingSuggestion[];
  issues: OralIssue[];
  clinicalDisclaimers: string[];
}

/**
 * Applies deterministic safety rules to raw visual findings and coding suggestions.
 */
export const applyClinicalSafetyRules = (
  rawFindings: VisualFinding[],
  imageAssessment: ImageAssessment,
  options: ClinicalSafetyOptions = {}
): SanitizedAnalysisResult => {
  const { triPlaqueGelConfirmed = false, preferredCodingSystem = 'WHO_ICD10' } = options;
  const sanitizedFindings: VisualFinding[] = [];
  const codingSuggestions: CodingSuggestion[] = [];
  const issues: OralIssue[] = [];
  const clinicalDisclaimers: string[] = [];

  // General 2D Photography Limitation
  clinicalDisclaimers.push(
    'Pemeriksaan fotografi 2 dimensi tidak dapat mengevaluasi permukaan aproksimal (di sela-sela gigi), area subgingiva, atau permukaan lingual/palatal yang tidak terjangkau lensa. Diperlukan pemeriksaan klinis langsung dan radiografis bitewing untuk evaluasi komprehensif.'
  );

  // If image was unassessable, abstain from all disease codes!
  if (imageAssessment.state === 'UNASSESSABLE') {
    clinicalDisclaimers.push(
      `Foto gigi tidak dapat dinilai secara klinis (${imageAssessment.reason}). Tidak ada temuan atau kode diagnosis yang dapat ditetapkan.`
    );
    return {
      visualFindings: [],
      codingSuggestions: [],
      issues: [],
      clinicalDisclaimers,
    };
  }

  const isPartial = imageAssessment.state === 'PARTIALLY_ASSESSABLE';
  if (isPartial) {
    clinicalDisclaimers.push(
      'Foto dinilai memiliki keterbatasan visual (sebagian area terhalang/kurang pencahayaan). Seluruh temuan visual bersifat indikatif awal dengan tingkat ketidakpastian yang lebih tinggi.'
    );
  }

  for (const finding of rawFindings) {
    const cuesLower = (finding.visualCues || []).join(' ').toLowerCase();
    const typeLower = (finding.findingType || '').toLowerCase();
    const locationLower = (finding.location || '').toLowerCase();

    // RULE 1: Color change alone is NOT proof of caries (handle negation)
    const hasNegation =
      cuesLower.includes('tanpa kavitas') ||
      cuesLower.includes('tidak ada kavitas') ||
      cuesLower.includes('no cavity') ||
      cuesLower.includes('without cavity') ||
      cuesLower.includes('non-cavitated') ||
      cuesLower.includes('non kavitas') ||
      typeLower.includes('non-carious') ||
      typeLower.includes('non karies');

    const hasCavity =
      !hasNegation &&
      (cuesLower.includes('kavitas') ||
        cuesLower.includes('cavity') ||
        cuesLower.includes('hole') ||
        cuesLower.includes('lubang') ||
        typeLower.includes('kavitas') ||
        typeLower.includes('cavitated'));

    const isStainOnly =
      typeLower.includes('stain') ||
      typeLower.includes('pewarnaan') ||
      ((cuesLower.includes('stain') || cuesLower.includes('pewarnaan') || cuesLower.includes('garis hitam')) && !hasCavity);

    // RULE 2: Red gingiva alone does NOT establish acute gingivitis (K05.0)
    const isGingivalRedness = typeLower.includes('gingivitis') || typeLower.includes('gusi') || locationLower.includes('gusi');

    // RULE 3: Visible dark pits alone do NOT prove dentin penetration
    const mentionsDentin = typeLower.includes('dentin') || cuesLower.includes('dentin');

    // RULE 4: Crowding != malnutrition
    const isCrowding = typeLower.includes('crowding') || typeLower.includes('berjejal') || typeLower.includes('malposisi');

    // RULE 6: Never infer pulp involvement from photo alone
    const mentionsPulp = typeLower.includes('pulp') || cuesLower.includes('pulpa');

    // RULE 7: TriPlaque Disclosing Gel Protocol Confirmation
    const isTriPlaque = typeLower.includes('triplaque') || typeLower.includes('plaque') || typeLower.includes('biofilm');

    // Process Finding and Map to Controlled Term
    let matchedCode = 'WHO:K02.9'; // Default provisional
    let requiresConfirmation = true;
    let abstentionReason: string | undefined = undefined;

    if (mentionsPulp) {
      // RULE 6 ENFORCEMENT: Strictly abstain from diagnosing pulp disease from photo alone
      clinicalDisclaimers.push(
        'Keterlibatan pulpa gigi tidak dapat didiagnosis semata-mata dari foto klinis biasa tanpa uji vitalitas pulpa dan pemeriksaan radiograf periapikal.'
      );
      matchedCode = preferredCodingSystem === 'ICD10_CM' ? 'ICD10CM:K02.52' : 'WHO:K02.1';
      abstentionReason = 'Diagnosis pulpa ditangguhkan karena foto visual tidak mencukupi untuk evaluasi vitalitas jaringan pulpa.';
    } else if (isTriPlaque) {
      if (!triPlaqueGelConfirmed) {
        // RULE 7 ENFORCEMENT: Without confirmation of GC Tri Plaque ID Gel protocol, do not classify as specific TriPlaque stage
        abstentionReason = 'Interpretasi warna TriPlaque ditangguhkan karena belum ada konfirmasi protokol aplikasi gel pewarna GC Tri Plaque ID.';
        matchedCode = 'WHO:K05.1'; // General plaque-related marginal observation
      } else {
        if (cuesLower.includes('pink') || cuesLower.includes('merah jambu')) {
          matchedCode = 'PROC:TP.01';
        } else if (cuesLower.includes('purple') || cuesLower.includes('ungu') || cuesLower.includes('biru tua')) {
          matchedCode = 'PROC:TP.02';
        } else if (cuesLower.includes('cyan') || cuesLower.includes('biru muda')) {
          matchedCode = 'PROC:TP.03';
        }
      }
    } else if (isCrowding) {
      matchedCode = 'WHO:K07.3';
      clinicalDisclaimers.push(
        'Temuan malposisi/gigi berjejal merupakan variasi pertumbuhan lengkung rahang dan ukuran gigi, BUKAN bukti langsung malnutrisi atau stunting.'
      );
    } else if (isGingivalRedness) {
      // RULE 2 ENFORCEMENT: Do not assign acute gingivitis K05.0; assign chronic marginal K05.1 with note
      matchedCode = 'WHO:K05.1';
      clinicalDisclaimers.push(
        'Eritema tepi gingiva pada anak sering kali merupakan hiperemia fisiologis akibat erupsi gigi aktif dan bukan otomatis gingivitis akut nekrotikans.'
      );
    } else if (typeLower.includes('hipoplasia') || typeLower.includes('hypoplasia')) {
      matchedCode = 'WHO:K00.4';
    } else if (typeLower.includes('fluorosis')) {
      matchedCode = 'WHO:K00.3';
    } else if (isStainOnly) {
      // RULE 1 ENFORCEMENT: Staining alone without cavitation is not dentin caries
      abstentionReason = 'Pewarnaan alur fisura ekstrinsik tanpa kavitas tidak membuktikan karies dentin aktif. Dianjurkan pembersihan dan evaluasi taktil langsung.';
      matchedCode = preferredCodingSystem === 'ICD10_CM' ? 'ICD10CM:K02.51' : 'WHO:K02.0';
    } else if (hasCavity && mentionsDentin) {
      // RULE 3: Cavity exposing dentin
      matchedCode = preferredCodingSystem === 'ICD10_CM' ? 'ICD10CM:K02.52' : 'WHO:K02.1';
    } else if (hasCavity) {
      matchedCode = preferredCodingSystem === 'ICD10_CM' ? 'ICD10CM:K02.52' : 'WHO:K02.1';
    } else {
      // Non-cavitated white spot or enamel fissure change
      matchedCode = preferredCodingSystem === 'ICD10_CM' ? 'ICD10CM:K02.51' : 'WHO:K02.0';
    }

    if (isPartial) {
      requiresConfirmation = true;
      abstentionReason = abstentionReason || 'Visualisasi sebagian gigi membatasi kepastian batas lesi.';
    }

    const term = lookupControlledTerm(matchedCode, preferredCodingSystem);
    if (term) {
      codingSuggestions.push({
        code: term.code,
        codeSystem: term.system as any,
        codeVersion: term.systemVersion,
        title: term.standardTitle,
        category: term.category,
        confidence: Math.round(finding.confidence * (isPartial ? 0.75 : 0.95) * 100) / 100,
        clinicalRationale: `Temuan visual: ${finding.visualCues.join(', ') || finding.findingType}. Lokasi: ${finding.location}. ${term.clinicalDescription}`,
        requiresClinicalConfirmation: requiresConfirmation || term.requiresTactileOrRadiographic,
        abstentionReason,
      });

      issues.push({
        diseaseName: `[${term.code}] ${term.standardTitle}`,
        description: `${finding.visualCues.join(', ')}. ${abstentionReason ? `(Catatan: ${abstentionReason})` : ''}`,
        boundingBox: finding.boundingBox, // Can be null!
        codingSuggestion: codingSuggestions[codingSuggestions.length - 1],
        confidence: finding.confidence,
      });
    }

    sanitizedFindings.push(finding);
  }

  return {
    visualFindings: sanitizedFindings,
    codingSuggestions,
    issues,
    clinicalDisclaimers: [...new Set(clinicalDisclaimers)],
  };
};
