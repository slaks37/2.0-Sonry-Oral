import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDb, isDbConfigured } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'sonri-oralytic-dev-secret-change-in-production';

export type UserRole = 'super_admin' | 'organization_admin' | 'clinician' | 'health_worker' | 'read_only';

export interface AuthUser {
  userId: string;
  organizationId: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

/**
 * Hash password securely with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verify password against stored hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Sign JWT session token
 */
export function generateToken(user: AuthUser, expiresIn: string = '7d'): string {
  return jwt.sign(
    {
      userId: user.userId,
      organizationId: user.organizationId,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: expiresIn as any }
  );
}

/**
 * Verify JWT token string
 */
export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Authentication middleware for Express
 */
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ error: 'Akses ditolak. Token autentikasi diperlukan.' });
    return;
  }

  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({ error: 'Sesi tidak valid atau telah kedaluwarsa. Silakan login kembali.' });
    return;
  }

  req.user = user;
  next();
}

/**
 * Role-Based Access Control (RBAC) middleware
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Pengguna belum terautentikasi.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Anda tidak memiliki hak akses yang cukup untuk tindakan ini.' });
      return;
    }

    next();
  };
}

/**
 * Records an audit log in PostgreSQL
 */
export async function logAuditEvent(params: {
  userId?: string;
  organizationId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
}): Promise<void> {
  if (!isDbConfigured()) return;
  try {
    const sql = getDb();
    const id = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await sql`
      INSERT INTO audit_logs (id, user_id, organization_id, action, resource_type, resource_id, details, ip_address)
      VALUES (
        ${id},
        ${params.userId || null},
        ${params.organizationId || null},
        ${params.action},
        ${params.resourceType},
        ${params.resourceId || null},
        ${JSON.stringify(params.details || {})},
        ${params.ipAddress || null}
      );
    `;
  } catch (err: any) {
    console.error('⚠️ [Audit Log Error]:', err?.message || err);
  }
}
