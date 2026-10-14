/**
 * Agnes AI Provider Implementation
 * Compatible with OpenAI /v1/chat/completions multimodal specification
 */

import { AIProvider } from './provider';
import {
  ImageQualityResponse,
  ImageQualityResponseSchema,
  OralAnalysisResponse,
  OralAnalysisResponseSchema,
  ClinicalReportResponse,
  ClinicalReportResponseSchema,
  normalizeBoundingBox,
} from './schemas';
import {
  QUALITY_CHECK_PROMPT,
  buildOralAnalysisPrompt,
  buildClinicalReportPrompt,
} from './prompts';
import { AIProviderError, AIErrorCode } from './errors';

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
          // Network connection error
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

  /**
   * Helper to safely extract JSON from string which might be wrapped in ```json ... ```
   */
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

  public async checkImageQuality(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<ImageQualityResponse> {
    const imageUri = this.formatDataUri(imageBase64, mimeType);

    const messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: QUALITY_CHECK_PROMPT },
          { type: 'image_url', image_url: { url: imageUri } },
        ],
      },
    ];

    try {
      const rawContent = await this.executeChatCompletion(messages);
      const parsed = this.parseJsonContent(rawContent);
      const validated = ImageQualityResponseSchema.safeParse(parsed);

      if (!validated.success) {
        return {
          quality: 'unable_to_assess',
          reason: 'Respons AI tidak sesuai format evaluasi kualitas.',
        };
      }

      return validated.data;
    } catch (err: any) {
      // NEVER default to 'good' on failure!
      return {
        quality: 'unable_to_assess',
        reason: err?.message || 'Gagal memeriksa kualitas gambar.',
      };
    }
  }

  public async analyzeOralImage(
    imageBase64: string,
    ageInYears: number,
    mimeType: string = 'image/jpeg',
    knowledgeBase?: string
  ): Promise<OralAnalysisResponse> {
    const imageUri = this.formatDataUri(imageBase64, mimeType);
    const prompt = buildOralAnalysisPrompt(ageInYears, knowledgeBase);

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

    // Normalize bounding boxes in parsed output
    if (Array.isArray(parsed?.issues)) {
      parsed.issues = parsed.issues.map((issue: any) => ({
        ...issue,
        diseaseName: String(issue?.diseaseName || 'Pemeriksaan Visual Gigi/Mulut'),
        description: String(issue?.description || ''),
        boundingBox: normalizeBoundingBox(issue?.boundingBox),
      }));
    }

    const validated = OralAnalysisResponseSchema.safeParse(parsed);
    if (!validated.success) {
      throw new AIProviderError(
        `Agnes AI output failed schema validation: ${validated.error.message}`,
        'VALIDATION_FAILED',
        502,
        false
      );
    }

    return validated.data;
  }

  public async generateClinicalReport(params: {
    patientData: any;
    stuntingData?: any;
    oralResults: any[];
    metrics: any;
    language?: 'id' | 'en';
  }): Promise<ClinicalReportResponse> {
    const { patientData, oralResults, metrics, language = 'id' } = params;

    const flattenedIssues: string[] = (oralResults || [])
      .flat()
      .map((item: any) => item?.diseaseName || item)
      .filter(Boolean);

    const oralIssuesSummary = flattenedIssues.length > 0 ? [...new Set(flattenedIssues)].join(', ') : '';

    const prompt = buildClinicalReportPrompt({
      patientName: patientData?.name || 'Pasien',
      ageYears: metrics?.ageYears || 0,
      gender: patientData?.gender || 'Unknown',
      metrics: metrics || {},
      oralIssuesSummary,
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

    return validated.data;
  }
}

// Singleton export
export const agnesAI = new AgnesProvider();
