import { describe, it, expect } from 'vitest';
import {
  calculateStuntingStatus,
  calculateWeightStatus,
  calculateWastingStatus,
  calculateLilaStatus,
  calculateBMI,
  calculateBMIStatus,
  calculateZScore,
  isValidMeasurement,
} from '../services/stuntingCalculator';

describe('WHO Child Growth Standards - Clinical Engine Tests', () => {
  describe('Z-Score Mathematical Engine', () => {
    it('calculates exact median z-score = 0 when measure equals M', () => {
      const lms = { L: 1, M: 50.0, S: 0.038 };
      const z = calculateZScore(50.0, lms);
      expect(z).toBe(0);
    });

    it('correctly uses logarithmic transformation when L = 0', () => {
      const lms = { L: 0, M: 10.0, S: 0.1 };
      const z = calculateZScore(10.0 * Math.exp(0.2), lms);
      expect(z).toBeCloseTo(2.0, 1);
    });

    it('returns null for zero or negative measurements', () => {
      const lms = { L: 1, M: 50.0, S: 0.038 };
      expect(calculateZScore(0, lms)).toBeNull();
      expect(calculateZScore(-10, lms)).toBeNull();
    });
  });

  describe('Validation of Implausible & Boundary Values', () => {
    it('rejects negative or impossible height/weight/circumference', () => {
      expect(isValidMeasurement(-5, 35, 140)).toBe(false);
      expect(isValidMeasurement(0, 35, 140)).toBe(false);
      expect(isValidMeasurement(300, 35, 140)).toBe(false);
      expect(isValidMeasurement(NaN, 35, 140)).toBe(false);
      expect(isValidMeasurement(Infinity, 35, 140)).toBe(false);
    });

    it('returns invalid status for out of bounds inputs without throwing', () => {
      const result = calculateStuntingStatus(12, -75, 'Male');
      expect(result.zScore).toBeNull();
      expect(result.status).toContain('Tidak Valid');
    });

    it('returns invalid status when age > 60 months in under-5 calculator', () => {
      const result = calculateStuntingStatus(72, 115, 'Male');
      expect(result.zScore).toBeNull();
      expect(result.status).toContain('Tidak Berlaku');
    });
  });

  describe('Age Verification Test Matrix: Newborn, 6m, 9m, 12m, 24m, 36m, 60m', () => {
    it('Newborn (0 months) Male: Height 50cm should be Normal (near median)', () => {
      const res = calculateStuntingStatus(0, 50.0, 'Male');
      expect(res.zScore).toBeCloseTo(0.06, 1);
      expect(res.status).toBe('Normal');
    });

    it('Newborn (0 months) Male: Height 43.5cm should be Severely Stunted (Z < -3)', () => {
      const res = calculateStuntingStatus(0, 43.5, 'Male');
      expect(res.zScore).not.toBeNull();
      expect(res.zScore!).toBeLessThan(-3);
      expect(res.status).toBe('Sangat Pendek (Stunting Berat)');
    });

    it('6 Months Male: Height 67.6cm should be Normal (median ~67.6)', () => {
      const res = calculateStuntingStatus(6, 67.6, 'Male');
      expect(res.zScore).toBeCloseTo(0, 1);
      expect(res.status).toBe('Normal');
    });

    it('9 Months Female: Height 65cm should be Stunted (-3 <= Z < -2)', () => {
      const res = calculateStuntingStatus(9, 65.0, 'Female');
      expect(res.zScore).not.toBeNull();
      expect(res.zScore!).toBeLessThan(-2);
      expect(res.zScore!).toBeGreaterThanOrEqual(-3);
      expect(res.status).toBe('Pendek (Stunting)');
    });

    it('12 Months Male: Height 75.7cm should be Normal (median ~75.7)', () => {
      const res = calculateStuntingStatus(12, 75.75, 'Male');
      expect(res.zScore).toBeCloseTo(0, 1);
      expect(res.status).toBe('Normal');
    });

    it('24 Months Female: Height 86.4cm should be Normal', () => {
      const res = calculateStuntingStatus(24, 86.4, 'Female');
      expect(res.zScore).toBeCloseTo(0, 1);
      expect(res.status).toBe('Normal');
    });

    it('36 Months Male: Height 96.9cm should be Normal (median ~96.9)', () => {
      const res = calculateStuntingStatus(36, 96.9, 'Male');
      expect(res.zScore).toBeCloseTo(0, 1);
      expect(res.status).toBe('Normal');
    });

    it('60 Months Male: Height 110cm should be Normal', () => {
      const res = calculateStuntingStatus(60, 110.0, 'Male');
      expect(res.zScore).toBeCloseTo(-0.47, 1);
      expect(res.status).toBe('Normal');
    });
  });

  describe('Weight Status (Underweight) & Wasting Status', () => {
    it('12 Months Male: 9.6 kg is Normal weight', () => {
      const res = calculateWeightStatus(12, 9.6, 'Male');
      expect(res.zScore).toBeCloseTo(0, 1);
      expect(res.status).toBe('Berat Badan Normal');
    });

    it('12 Months Male: 7.5 kg is Underweight (-3 <= Z < -2)', () => {
      const res = calculateWeightStatus(12, 7.5, 'Male');
      expect(res.zScore).toBeLessThan(-2);
      expect(res.zScore).toBeGreaterThanOrEqual(-3);
      expect(res.status).toBe('Berat Badan Kurang');
    });

    it('12 Months Male: 6.5 kg is Severely Underweight (Z < -3)', () => {
      const res = calculateWeightStatus(12, 6.5, 'Male');
      expect(res.zScore).toBeLessThan(-3);
      expect(res.status).toBe('Berat Badan Sangat Kurang');
    });

    it('Wasting: Height 80cm, Weight 7.5kg is Severely Wasted (Gizi Buruk)', () => {
      const res = calculateWastingStatus(80, 7.5, 'Male');
      expect(res.zScore).toBeLessThan(-3);
      expect(res.status).toBe('Gizi Buruk (Wasting Berat)');
    });
  });

  describe('LiLA / MUAC Interpretation with Strict Age Bounds', () => {
    it('rejects MUAC for infants < 6 months', () => {
      expect(calculateLilaStatus(12.0, 3)).toContain('Tidak Berlaku');
    });

    it('rejects MUAC for children >= 60 months', () => {
      expect(calculateLilaStatus(13.0, 65)).toContain('Tidak Berlaku');
    });

    it('correctly classifies Red / Severe Acute Malnutrition (< 11.5 cm) at 12m', () => {
      expect(calculateLilaStatus(11.0, 12)).toBe('Gizi Buruk');
    });

    it('correctly classifies Yellow / Moderate Acute Malnutrition (11.5 - 12.4 cm) at 18m', () => {
      expect(calculateLilaStatus(12.0, 18)).toBe('Gizi Kurang');
    });

    it('correctly classifies Green / Normal (>= 12.5 cm) at 24m', () => {
      expect(calculateLilaStatus(13.5, 24)).toBe('Gizi Baik');
    });
  });

  describe('BMI and Older Children (>= 5 Years)', () => {
    it('calculates BMI accurately for 120cm, 22kg', () => {
      const bmi = calculateBMI(22, 120);
      expect(bmi).toBe(15.3);
    });

    it('evaluates BMI-for-age for 72 months boy', () => {
      const res = calculateBMIStatus(72, 15.3, 'Male');
      expect(res.status).toBe('Gizi Baik (Normal)');
    });
  });
});
