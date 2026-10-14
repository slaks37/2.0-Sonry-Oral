/**
 * @deprecated Use services/aiService.ts instead.
 * This module re-exports the provider-neutral Agnes AI service for backward compatibility.
 */

export {
  checkImageQuality,
  analyzeOralImageWithBoundingBox,
  generateFinalReport,
} from './aiService';
export type { QualityCheckResult } from './aiService';
