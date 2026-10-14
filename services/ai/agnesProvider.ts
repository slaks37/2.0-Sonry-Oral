/**
 * Agnes AI Provider Implementation
 * Staged Pediatric Dental Computer Vision & Clinical Report Synthesis
 */

import { AIProvider } from './provider';
import {
  ImageQualityResponse,
  ImageAssessmentSchema,
  OralAnalysisResponse,
  StagedOralAnalysisResponseSchema,
  ClinicalReportResponse,
  ClinicalReportResponseSchema,
  normalizeBoundingBox,
} from './schemas';
import {
  buildQualityCheckPrompt,
  buildOralAnalysisPrompt,
  buildClinicalReportPrompt,
} from './prompts';
import { AIProviderError, AIErrorCode } from './errors';
import { ToothViewType } from '../../types';
import { applyClinicalSafetyRules } from '../clinicalSafety';

export interface AgnesConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export class AgnesProvider implements AIProvider {
  public readonly providerName = 'Agnes AI';
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(config: AgnesConfig = {}) {
    this.apiKey = config.apiKey || process.env.AGNES_API_KEY || '';
    this.baseUrl = (config.baseUrl || process.env.AGNES_BASE_URL || 'https://apihub.agnes-ai.com/v1').replace(/\/+$/, '');
    this.model = config.model || process.env.AGNES_MODEL || 'agnes-2.5-flash';
    this.timeoutMs = config.timeoutMs || 35000;
    this.maxRetries = config.maxRetries ?? 2;
  }

  /**
   * Helper to execute chat completions with timeout, retry, and error classification.
   */
  private async executeChatCompletion(messages: any[]): Promise<string> {
    if (!this.apiKey) {
      throw new AIProviderError(
        'Layanan AI Agnes belum dikonfigurasi di server. Silakan hubungi administrator (AGNES_API_KEY is missing).',
        'MISSING_API_KEY',
        503,
        false
      );
    }

    const endpoint = `${this.baseUrl}/chat/completions`;
    const payload = {
      model: this.model,
      messages,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    };

    let attempt = 0;
    let lastError: any = null;

    while (attempt <= this.maxRetries) {
      attempt++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const status = response.status;
          const errorBody = await response.text().catch(() => '');
          let errorCode: AIErrorCode = 'PROVIDER_UNAVAILABLE';
          let retryable = false;

          if (status === 400) {
            errorCode = 'INVALID_REQUEST';
          } else if (status === 401) {
            errorCode = 'AUTHENTICATION_FAILED';
          } else if (status === 403) {
            errorCode = 'PERMISSION_DENIED';
          } else if (status === 408) {
            errorCode = 'TIMEOUT';
            retryable = true;
          } else if (status === 413) {
            errorCode = 'PAYLOAD_TOO_LARGE';
          } else if (status === 429) {
            errorCode = 'RATE_LIMITED';
            retryable = true;
          } else if (status >= 500) {
            errorCode = 'PROVIDER_UNAVAILABLE';
            retryable = true;
          }

          const err = new AIProviderError(
            `Agnes AI API returned status ${status}: ${errorBody || response.statusText}`,
            errorCode,
            status,
            retryable
          );

          if (retryable && attempt <= this.maxRetries) {
            lastError = err;
            const delay = Math.pow(2, attempt) * 500 + Math.random() * 200;
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          throw err;
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (!content || typeof content !== 'string') {
          throw new AIProviderError(
            'Agnes AI response did not contain message content',
            'MALFORMED_RESPONSE',
            502,
            true
          );
        }

        return content;
      } catch (err: any) {
        clearTimeout(timeoutId);

        if (err instanceof AIProviderError) {
          if (!err.retryable || attempt > this.maxRetries) throw err;
          lastError = err;
        } else if (err.name === 'AbortError') {
          const timeoutErr = new AIProviderError('Agnes AI request timed out', 'TIMEOUT', 504, true);
          if (attempt > this.maxRetries) throw timeoutErr;
          lastError = timeoutErr;
        } else {
          const netErr = new AIProviderError(
            `Network error communicating with Agnes AI: ${err.message}`,
            'PROVIDER_UNAVAILABLE',
            503,
            true
          );
          if (attempt > this.maxRetries) throw netErr;
          lastError = netErr;
        }

        const delay = Math.pow(2, attempt) * 500 + Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new AIProviderError('Agnes AI request failed after retries', 'PROVIDER_UNAVAILABLE', 503, false);
  }

  private parseJsonContent(rawContent: string): any {
    const cleaned = rawContent
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch (e: any) {
      throw new AIProviderError(
        `Failed to parse Agnes AI JSON response: ${e.message}`,
        'MALFORMED_RESPONSE',
        502,
        false
      );
    }
  }

  private formatDataUri(imageBase64: string, mimeType: string = 'image/jpeg'): string {
    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    return `data:${mimeType};base64,${cleanBase64}`;
  }

  /**
   * Stage A: Strict Image Validation and Assessability Gating
   */
  public async checkImageQuality(
    imageBase64: string,
    mimeType: string = 'image/jpeg',
    viewType: ToothViewType = 'FRONT_VIEW'
  ): Promise<ImageQualityResponse> {
    const imageUri = this.formatDataUri(imageBase64, mimeType);
    const prompt = buildQualityCheckPrompt(viewType);

    const messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUri } },
        ],
      },
    ];

    try {
      const rawContent = await this.executeChatCompletion(messages);
      const parsed = this.parseJsonContent(rawContent);

      // Validate schema
      const validated = ImageAssessmentSchema.safeParse(parsed);
      if (!validated.success) {
        return {
          state: 'UNASSESSABLE',
          isOralCavity: false,
          teethVisible: false,
          viewType,
          qualityFactors: {
            blur: true,
            glare: false,
            darkness: false,
            obstruction: false,
            poorFraming: false,
            nonOralImage: false,
            teethInvisible: false,
          },
          quality: 'unable_to_assess',
          reason: 'Respons validasi kualitas dari AI tidak memenuhi format terstruktur.',
        };
      }

      const data = validated.data;

      // Clinical gating rules:
      // If non-oral image or teeth invisible or severe defects -> UNASSESSABLE
      if (!data.isOralCavity || !data.teethVisible || data.qualityFactors.nonOralImage || data.qualityFactors.teethInvisible) {
        return {
          ...data,
          state: 'UNASSESSABLE',
          quality: 'unable_to_assess',
          reason: data.reason || 'Foto bukan merupakan rongga mulut atau gigi tidak terlihat jelas.',
        };
      }

      if (data.qualityFactors.blur || data.qualityFactors.darkness || data.qualityFactors.obstruction) {
        if (data.state === 'ASSESSABLE') {
          data.state = 'PARTIALLY_ASSESSABLE';
        }
      }

      return data;
    } catch (err: any) {
      // NEVER default to 'good' on failure!
      return {
        state: 'UNASSESSABLE',
        isOralCavity: false,
        teethVisible: false,
        viewType,
        qualityFactors: {
          blur: false,
          glare: false,
          darkness: false,
          obstruction: false,
          poorFraming: false,
          nonOralImage: false,
          teethInvisible: false,
        },
        quality: 'unable_to_assess',
        reason: err?.message || 'Gagal memeriksa kualitas gambar pada server AI.',
      };
    }
  }

  /**
   * Stage B - E: Multi-Stage Oral Disease Screening
   */
  public async analyzeOralImage(
    imageBase64: string,
    ageInYears: number,
    mimeType: string = 'image/jpeg',
    knowledgeBase?: string,
    viewType: ToothViewType = 'FRONT_VIEW'
  ): Promise<OralAnalysisResponse> {
    const imageUri = this.formatDataUri(imageBase64, mimeType);
    const prompt = buildOralAnalysisPrompt(ageInYears, viewType, knowledgeBase);

    const messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUri } },
        ],
      },
    ];

    const rawContent = await this.executeChatCompletion(messages);
    const parsed = this.parseJsonContent(rawContent);

    // Normalize imageAssessment
    const imageAssessment = ImageAssessmentSchema.parse(
      parsed.imageAssessment || {
        state: 'ASSESSABLE',
        isOralCavity: true,
        teethVisible: true,
        viewType,
        qualityFactors: {},
        quality: 'good',
        reason: 'Foto dinilai memenuhi syarat visual screening.',
      }
    );

    // Normalize visualFindings with nullable bounding boxes
    const rawVisualFindings = Array.isArray(parsed?.visualFindings) ? parsed.visualFindings : [];
    const normalizedFindings = rawVisualFindings.map((finding: any, idx: number) => ({
      id: finding.id || `VF-${Date.now()}-${idx}`,
      findingType: String(finding.findingType || 'Visual abnormality'),
      location: String(finding.location || 'Tooth surface'),
      visualCues: Array.isArray(finding.visualCues) ? finding.visualCues.map(String) : [],
      confidence: typeof finding.confidence === 'number' ? Math.max(0, Math.min(1, finding.confidence)) : 0.7,
      severity: ['Low', 'Medium', 'High'].includes(finding.severity) ? finding.severity : 'Low',
      boundingBox: normalizeBoundingBox(finding.boundingBox), // Nullable!
      unconfirmed: true,
      clinicalNote: finding.clinicalNote ? String(finding.clinicalNote) : undefined,
    }));

    // Apply deterministic clinical safety rules
    const safetyResult = applyClinicalSafetyRules(normalizedFindings, imageAssessment, {
      preferredCodingSystem: 'WHO_ICD10',
    });

    // Localized teeth adapter
    const rawRegions = Array.isArray(parsed?.localizedTeeth?.regions) ? parsed.localizedTeeth.regions : [];
    const localizedTeeth = {
      regions: rawRegions.map((r: any) => ({
        regionId: String(r.regionId || 'region_general'),
        label: String(r.label || 'Visible dental arch'),
        fdiNotation: Array.isArray(r.fdiNotation) ? r.fdiNotation.map(String) : undefined,
        confidence: typeof r.confidence === 'number' ? r.confidence : 0.8,
        boundingBox: normalizeBoundingBox(r.boundingBox),
      })),
      detectionMethod: 'interim_llm_visual_cue' as const,
      isClinicallyValidated: false,
    };

    // Construct unified staged response
    const issues = safetyResult.issues;
    const hygieneAssessment = ['Good', 'Fair', 'Poor', 'Not Assessable'].includes(parsed?.hygieneAssessment)
      ? parsed.hygieneAssessment
      : 'Fair';

    let summaryDiagnosisStatus: 'NO_VISIBLE_ABNORMALITY' | 'ABNORMALITY_SUSPECTED' | 'UNABLE_TO_ASSESS' = 'ABNORMALITY_SUSPECTED';
    if (imageAssessment.state === 'UNASSESSABLE') {
      summaryDiagnosisStatus = 'UNABLE_TO_ASSESS';
    } else if (issues.length === 0 && imageAssessment.state === 'ASSESSABLE') {
      summaryDiagnosisStatus = 'NO_VISIBLE_ABNORMALITY';
    }

    const stagedResponse = {
      imageAssessment,
      localizedTeeth,
      visualFindings: safetyResult.visualFindings,
      codingSuggestions: safetyResult.codingSuggestions,
      reviewStatus: { status: 'unreviewed' as const },
      hygieneAssessment,
      summaryDiagnosisStatus,
      issues,
    };

    const validated = StagedOralAnalysisResponseSchema.safeParse(stagedResponse);
    if (!validated.success) {
      throw new AIProviderError(
        `Agnes AI output failed staged schema validation: ${validated.error.message}`,
        'VALIDATION_FAILED',
        502,
        false
      );
    }

    return validated.data;
  }

  /**
   * Stage F: Clinical Report Generation with Safety Safeguards
   */
  public async generateClinicalReport(params: {
    patientData: any;
    stuntingData?: any;
    oralResults: any[];
    metrics: any;
    language?: 'id' | 'en';
  }): Promise<ClinicalReportResponse> {
    const { patientData, oralResults, metrics, language = 'id' } = params;

    // Check assessability across all analyses
    const flatResults = (oralResults || []).flat();
    const hasUnassessableImage = flatResults.some(
      (res: any) => res?.imageAssessment?.state === 'UNASSESSABLE' || res?.summaryDiagnosisStatus === 'UNABLE_TO_ASSESS'
    );

    const viewsExamined = [...new Set(flatResults.map((res: any) => res?.imageAssessment?.viewType).filter(Boolean))];
    const allFindings = flatResults.flatMap((res: any) => res?.visualFindings || []);
    const allCodes = flatResults.flatMap((res: any) => res?.codingSuggestions || []);

    const findingsDetail = allFindings
      .map((f: any) => `${f.findingType} (${f.location}): ${(f.visualCues || []).join(', ')}`)
      .slice(0, 8)
      .join('; ');

    const codingSummary = allCodes
      .map((c: any) => `[${c.codeSystem} ${c.code}] ${c.title} (Confidence: ${Math.round(c.confidence * 100)}%)`)
      .slice(0, 8)
      .join('; ');

    const prompt = buildClinicalReportPrompt({
      patientName: patientData?.name || 'Pasien',
      ageYears: metrics?.ageYears || 0,
      gender: patientData?.gender || 'Unknown',
      metrics: metrics || {},
      stagedOralSummary: {
        assessabilityStatus: hasUnassessableImage ? 'PARTIALLY UNASSESSABLE' : 'ASSESSABLE',
        viewsExamined: viewsExamined.length > 0 ? viewsExamined : ['Frontal view'],
        visualFindingsCount: allFindings.length,
        findingsDetail,
        codingSummary,
        hasUnassessableImage,
      },
      language,
    });

    const messages = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    const rawContent = await this.executeChatCompletion(messages);
    const parsed = this.parseJsonContent(rawContent);

    const validated = ClinicalReportResponseSchema.safeParse(parsed);
    if (!validated.success) {
      throw new AIProviderError(
        `Agnes AI clinical report failed schema validation: ${validated.error.message}`,
        'VALIDATION_FAILED',
        502,
        false
      );
    }

    const report = validated.data;

    // CLINICAL SAFETY RULE ENFORCEMENT:
    // If any image was UNASSESSABLE, report CANNOT conclude "Healthy"!
    if (hasUnassessableImage && report.oralResult === 'Healthy') {
      report.oralResult = 'Needs Referral';
      report.oralReason = `Perhatian Klinis: Terdapat foto gigi yang tidak dapat dinilai secara visual. Kesimpulan tidak dapat dinyatakan sehat tanpa pemeriksaan langsung oleh dokter gigi. ${report.oralReason}`;
    }

    return report;
  }
}

export const agnesAI = new AgnesProvider();
