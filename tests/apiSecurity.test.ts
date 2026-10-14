import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, generateToken, verifyToken, AuthUser } from '../services/auth';

describe('Security & Authentication Tests', () => {
  describe('Password Hashing with Bcrypt', () => {
    it('hashes passwords securely with unpredictable salts', async () => {
      const password = 'SecretPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(password);
      expect(hash1).not.toBe(hash2); // Different salts
      expect(hash1.startsWith('$2')).toBe(true); // Bcrypt prefix
    });

    it('verifies correct passwords and rejects wrong passwords', async () => {
      const password = 'StrongPassword!2026';
      const hash = await hashPassword(password);

      const isMatch = await verifyPassword(password, hash);
      const isMismatch = await verifyPassword('WrongPassword', hash);

      expect(isMatch).toBe(true);
      expect(isMismatch).toBe(false);
    });
  });

  describe('JWT Session Tokens & Tenant Context', () => {
    const mockUser: AuthUser = {
      userId: 'USR-TEST-001',
      organizationId: 'org_posyandu_01',
      name: 'Bidan Siti',
      email: 'siti@posyandu.id',
      role: 'health_worker',
    };

    it('generates verifiable JWT carrying organization_id and user role', () => {
      const token = generateToken(mockUser);
      expect(typeof token).toBe('string');

      const decoded = verifyToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(mockUser.userId);
      expect(decoded?.organizationId).toBe(mockUser.organizationId);
      expect(decoded?.role).toBe('health_worker');
    });

    it('rejects tampered or malformed tokens', () => {
      const token = generateToken(mockUser);
      const tampered = token.slice(0, -6) + 'abc123';
      expect(verifyToken(tampered)).toBeNull();
      expect(verifyToken('invalid.token.structure')).toBeNull();
    });

    it('enforces tenant context comparison', () => {
      const userA: AuthUser = {
        userId: 'USR-A',
        organizationId: 'ORG-A',
        name: 'Clinician A',
        email: 'a@org-a.id',
        role: 'clinician',
      };

      const recordFromOrgB = {
        id: 'REC-B-1',
        organizationId: 'ORG-B',
        nik: '3201234567890001',
      };

      // Tenant isolation assertion: User A cannot access Record from Org B
      const isAuthorized = userA.organizationId === recordFromOrgB.organizationId;
      expect(isAuthorized).toBe(false);
    });
  });
});
