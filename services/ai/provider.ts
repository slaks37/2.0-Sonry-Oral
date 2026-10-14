import { ImageQualityResponse, OralAnalysisResponse, ClinicalReportResponse } from './schemas';
import { ToothViewType } from '../../types';

export interface AIProvider {
  readonly providerName: string;

  checkImageQuality(
    imageBase64: string,
    mimeType?: string,
    viewType?: ToothViewType
  ): Promise<ImageQualityResponse>;

  analyzeOralImage(
    imageBase64: string,
    ageInYears: number,
    mimeType?: string,
    knowledgeBase?: string,
    viewType?: ToothViewType
  ): Promise<OralAnalysisResponse>;

  generateClinicalReport(params: {
    patientData: any;
    stuntingData?: any;
    oralResults: any[];
    metrics: any;
    language?: 'id' | 'en';
  }): Promise<ClinicalReportResponse>;
}
