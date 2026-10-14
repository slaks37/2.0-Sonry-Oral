import { describe, it, expect } from 'vitest';
import { normalizeBoundingBox, OralAnalysisResponseSchema, ImageQualityResponseSchema } from '../services/ai/schemas';
import { AgnesProvider } from '../services/ai/agnesProvider';
import { AIProviderError } from '../services/ai/errors';

describe('Agnes AI Provider & Schema Normalization Tests', () => {
  describe('Bounding Box Normalizer', () => {
    it('normalizes percentage coordinates within 0..100', () => {
      const box = normalizeBoundingBox({ x: 25.5, y: 30.2, width: 40, height: 50 });
      expect(box).toEqual({ x: 25.5, y: 30.2, width: 40, height: 50 });
    });

    it('converts 0..1 decimal coordinates to 0..100 percentage', () => {
      const box = normalizeBoundingBox({ x: 0.25, y: 0.30, width: 0.40, height: 0.50 });
      expect(box).toEqual({ x: 25, y: 30, width: 40, height: 50 });
    });

    it('clamps negative or exceeding coordinates to stay within boundaries', () => {
      const box = normalizeBoundingBox({ x: -10, y: 50, width: 150, height: 40 });
      expect(box).not.toBeNull();
      expect(box!.x).toBe(0);
      expect(box!.y).toBe(50);
      expect(box!.width).toBe(100);
      expect(box!.height).toBe(40);
    });

    it('permits boundingBox null when missing or invalid (Directive 5)', () => {
      expect(normalizeBoundingBox(null)).toBeNull();
      expect(normalizeBoundingBox(undefined)).toBeNull();
      expect(normalizeBoundingBox({ x: 0, y: 0, width: 0, height: 0 })).toBeNull();
      expect(normalizeBoundingBox({ x: 'invalid', y: 10, width: 20, height: 20 })).toBeNull();
    });
  });

  describe('Zod Schema Validation for Agnes Responses', () => {
    it('validates a standard oral analysis response', () => {
      const valid = {
        issues: [
          {
            diseaseName: 'K02.51 Dental caries on pit and fissure surface, limited to enamel',
            description: 'Diduga karies pit dan fisur email',
            boundingBox: { x: 10, y: 20, width: 15, height: 15 },
          },
        ],
        hygieneAssessment: 'Fair',
      };
      const result = OralAnalysisResponseSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('validates quality check schema with explicit states', () => {
      expect(ImageQualityResponseSchema.safeParse({ quality: 'good', reason: 'Jelas' }).success).toBe(true);
      expect(ImageQualityResponseSchema.safeParse({ quality: 'poor', reason: 'Buram' }).success).toBe(true);
      expect(ImageQualityResponseSchema.safeParse({ quality: 'unable_to_assess', reason: 'Error' }).success).toBe(true);
      expect(ImageQualityResponseSchema.safeParse({ quality: 'excellent', reason: 'x' }).success).toBe(false);
    });
  });

  describe('Agnes Provider Fail-Safe Behavior', () => {
    it('throws honest error when AGNES_API_KEY is not configured', async () => {
      const provider = new AgnesProvider({ apiKey: '' });
      await expect(
        provider.analyzeOralImage('dummyBase64', 3)
      ).rejects.toThrowError(AIProviderError);
    });

    it('returns unable_to_assess when checkImageQuality fails and never returns good', async () => {
      const provider = new AgnesProvider({ apiKey: '' });
      const res = await provider.checkImageQuality('dummyBase64');
      expect(res.quality).toBe('unable_to_assess');
      expect(res.quality).not.toBe('good');
      expect(res.state).toBe('UNASSESSABLE');
    });
  });
});
