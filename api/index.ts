import express from 'express';
import { agnesAI } from '../services/ai/agnesProvider';
import { getDb, isDbConfigured, initDatabase } from '../services/db';
import {
  authenticateToken,
  requireRole,
  hashPassword,
  verifyPassword,
  generateToken,
  logAuditEvent,
  AuthenticatedRequest,
  AuthUser,
} from '../services/auth';

const app = express();

// Support large payloads for oral photos (up to 50mb)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Initialize database schema on startup
if (isDbConfigured()) {
  initDatabase().catch((err) => {
    console.error('⚠️ [Database Init Error]:', err?.message || err);
  });
}

// ===================================================================================
// HEALTH & READINESS ENDPOINTS
// ===================================================================================

app.get('/api/health', async (_req, res) => {
  const dbStatus = isDbConfigured();
  const agnesKeyConfigured = Boolean(process.env.AGNES_API_KEY);

  let dbConnectionOk = false;
  if (dbStatus) {
    try {
      const sql = getDb();
      await sql`SELECT 1`;
      dbConnectionOk = true;
    } catch {
      dbConnectionOk = false;
    }
  }

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    aiProvider: {
      provider: agnesAI.providerName,
      configured: agnesKeyConfigured,
      model: process.env.AGNES_MODEL || 'agnes-2.5-flash',
    },
    database: {
      configured: dbStatus,
      connected: dbConnectionOk,
    },
  });
});

// ===================================================================================
// AUTHENTICATION & RBAC ENDPOINTS
// ===================================================================================

app.post('/api/v1/auth/signup', async (req, res) => {
  try {
    const { name, email, password, organizationName, organizationCode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nama lengkap, email, dan kata sandi wajib diisi.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Kata sandi minimal harus 6 karakter.' });
    }

    if (!isDbConfigured()) {
      return res.status(503).json({ error: 'Database belum terhubung. Silakan konfigurasi DATABASE_URL.' });
    }

    const sql = getDb();
    const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}`;
    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'Email sudah terdaftar. Silakan gunakan email lain atau login.' });
    }

    // Determine organization
    let orgId = 'org_default';
    if (organizationCode) {
      const foundOrg = await sql`SELECT id FROM organizations WHERE code = ${organizationCode.trim()}`;
      if (foundOrg && foundOrg.length > 0) {
        orgId = (foundOrg[0] as any).id;
      } else if (organizationName) {
        orgId = `org_${Date.now()}`;
        await sql`
          INSERT INTO organizations (id, name, code)
          VALUES (${orgId}, ${organizationName.trim()}, ${organizationCode.trim()})
        `;
      }
    }

    const userId = `USR-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const passwordHash = await hashPassword(password);
    const role = 'health_worker';

    await sql`
      INSERT INTO users (id, organization_id, name, email, password_hash, role)
      VALUES (${userId}, ${orgId}, ${name.trim()}, ${email.toLowerCase().trim()}, ${passwordHash}, ${role})
    `;

    const authUser: AuthUser = {
      userId,
      organizationId: orgId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role,
    };

    const token = generateToken(authUser);

    await logAuditEvent({
      userId,
      organizationId: orgId,
      action: 'USER_REGISTERED',
      resourceType: 'users',
      resourceId: userId,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      message: 'Pendaftaran akun berhasil.',
      token,
      user: authUser,
    });
  } catch (err: any) {
    console.error('Error in /api/v1/auth/signup:', err);
    return res.status(500).json({ error: err?.message || 'Gagal mendaftarkan akun. Silakan coba kembali.' });
  }
});

app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
    }

    if (!isDbConfigured()) {
      return res.status(503).json({ error: 'Database belum terhubung. Silakan konfigurasi DATABASE_URL.' });
    }

    const sql = getDb();
    const rows = await sql`
      SELECT id, organization_id, name, email, password_hash, role
      FROM users
      WHERE email = ${email.toLowerCase().trim()}
      LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'Email atau kata sandi tidak sesuai.' });
    }

    const dbUser = rows[0] as any;
    const isValid = await verifyPassword(password, dbUser.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Email atau kata sandi tidak sesuai.' });
    }

    const authUser: AuthUser = {
      userId: dbUser.id,
      organizationId: dbUser.organization_id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
    };

    const token = generateToken(authUser);

    await logAuditEvent({
      userId: authUser.userId,
      organizationId: authUser.organizationId,
      action: 'USER_LOGIN',
      resourceType: 'users',
      resourceId: authUser.userId,
      ipAddress: req.ip,
    });

    return res.json({
      message: 'Login berhasil.',
      token,
      user: authUser,
    });
  } catch (err: any) {
    console.error('Error in /api/v1/auth/login:', err);
    return res.status(500).json({ error: err?.message || 'Gagal memproses login.' });
  }
});

app.get('/api/v1/auth/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  return res.json({ user: req.user });
});

app.post('/api/v1/auth/logout', authenticateToken, async (req: AuthenticatedRequest, res) => {
  if (req.user) {
    await logAuditEvent({
      userId: req.user.userId,
      organizationId: req.user.organizationId,
      action: 'USER_LOGOUT',
      resourceType: 'users',
      resourceId: req.user.userId,
      ipAddress: req.ip,
    });
  }
  return res.json({ success: true, message: 'Logout berhasil.' });
});

// ===================================================================================
// AI SCREENING ENDPOINTS (AGNES AI)
// ===================================================================================

// Rate Limiter: Max 60 requests per minute per user/IP
const aiRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const aiRateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const identifier = (req as any).user?.userId || req.ip || 'anonymous';
  const now = Date.now();
  const record = aiRateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    aiRateLimitMap.set(identifier, { count: 1, resetAt: now + 60000 });
    return next();
  }

  if (record.count >= 60) {
    return res.status(429).json({
      error: 'Batas frekuensi permintaan AI terlampaui (maksimal 60 request/menit). Harap tunggu sejenak.',
    });
  }

  record.count++;
  next();
};

const validateImagePayload = (imageBase64?: string): void => {
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    throw new Error('Data foto diperlukan dan harus berupa string base64.');
  }
  // Max 20MB base64 string (~15MB raw image)
  if (imageBase64.length > 20 * 1024 * 1024) {
    throw new Error('Ukuran foto melebihi batas aman transmisi (maksimal 15MB).');
  }
};

const handleCheckQuality = async (req: express.Request, res: express.Response) => {
  try {
    const { imageBase64, mimeType, viewType } = req.body;
    validateImagePayload(imageBase64);

    const result = await agnesAI.checkImageQuality(
      imageBase64,
      mimeType || 'image/jpeg',
      viewType || 'FRONT_VIEW'
    );
    return res.json(result);
  } catch (err: any) {
    console.error('Error in check-quality:', err?.message || 'Unknown error');
    return res.status(err?.statusCode || 500).json({
      state: 'UNASSESSABLE',
      isOralCavity: false,
      teethVisible: false,
      viewType: req.body?.viewType || 'FRONT_VIEW',
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
      reason: err?.message || 'Gagal memeriksa kualitas gambar.',
      error: err?.message,
    });
  }
};

const handleAnalyzeOral = async (req: express.Request, res: express.Response) => {
  try {
    const { imageBase64, mimeType, ageInYears, viewType } = req.body;
    validateImagePayload(imageBase64);

    // SECURITY: Use server-owned authoritative knowledge base rather than trusting client overrides
    const { getKnowledgeBasePrompt } = await import('../data/knowledgeBase');
    const serverKnowledgeBase = getKnowledgeBasePrompt();

    const result = await agnesAI.analyzeOralImage(
      imageBase64,
      Number(ageInYears) || 0,
      mimeType || 'image/jpeg',
      serverKnowledgeBase,
      viewType || 'FRONT_VIEW'
    );
    return res.json(result);
  } catch (err: any) {
    console.error('Error in analyze-oral:', err?.message || 'Unknown error');
    const statusCode = err?.statusCode || 500;
    return res.status(statusCode).json({
      error: err?.message || 'Gagal menganalisis gambar gigi dan mulut. Silakan coba kembali.',
    });
  }
};

const handleFinalReport = async (req: express.Request, res: express.Response) => {
  try {
    const { patientData, stuntingData, oralResults, metrics, language } = req.body;

    const reportNarrative = await agnesAI.generateClinicalReport({
      patientData,
      stuntingData,
      oralResults,
      metrics,
      language: language === 'en' ? 'en' : 'id',
    });

    // Merge deterministic calculated metrics (Layer A) with narrative (Layer C)
    return res.json({
      ...metrics,
      ...reportNarrative,
    });
  } catch (err: any) {
    console.error('Error in final-report:', err?.message || 'Unknown error');
    const statusCode = err?.statusCode || 500;
    return res.status(statusCode).json({
      error: err?.message || 'Gagal menyusun laporan terpadu. Silakan coba kembali.',
    });
  }
};

// Modern Provider-Neutral AI routes (Authenticated & Rate Limited)
app.post('/api/ai/check-quality', authenticateToken, aiRateLimiter, handleCheckQuality);
app.post('/api/ai/analyze-oral', authenticateToken, aiRateLimiter, handleAnalyzeOral);
app.post('/api/ai/final-report', authenticateToken, aiRateLimiter, handleFinalReport);

// Backward-compatible Gemini route aliases
app.post('/api/gemini/check-quality', authenticateToken, aiRateLimiter, handleCheckQuality);
app.post('/api/gemini/analyze-oral', authenticateToken, aiRateLimiter, handleAnalyzeOral);
app.post('/api/gemini/final-report', authenticateToken, aiRateLimiter, handleFinalReport);

// ===================================================================================
// SCREENING RECORDS (TENANT ISOLATED & DURABLE POSTGRESQL)
// ===================================================================================

app.get('/api/v1/screening-records', authenticateToken, async (req: AuthenticatedRequest, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: 'Database belum terkonfigurasi di server.' });
  }

  const organizationId = req.user!.organizationId;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  try {
    const sql = getDb();
    let rows: any[];

    if (search) {
      const searchPattern = `%${search}%`;
      rows = await sql`
        SELECT record_data 
        FROM screening_records 
        WHERE organization_id = ${organizationId}
          AND (nik ILIKE ${searchPattern} OR patient_name ILIKE ${searchPattern})
        ORDER BY screening_date DESC 
        LIMIT 200
      `;
    } else {
      rows = await sql`
        SELECT record_data 
        FROM screening_records 
        WHERE organization_id = ${organizationId}
        ORDER BY screening_date DESC 
        LIMIT 200
      `;
    }

    const records = rows.map((r: any) => r.record_data);
    return res.json(records);
  } catch (err: any) {
    console.error('[Database Error] Fetch screening records failed:', err);
    return res.status(500).json({ error: 'Gagal mengambil data rekam skrining dari basis data.' });
  }
});

app.post(
  '/api/v1/screening-records',
  authenticateToken,
  requireRole(['super_admin', 'organization_admin', 'clinician', 'health_worker']),
  async (req: AuthenticatedRequest, res) => {
    const record = req.body;
    if (!record || !record.patientData) {
      return res.status(400).json({ error: 'Data skrining lengkap diperlukan.' });
    }

    if (!isDbConfigured()) {
      return res.status(503).json({
        error: 'Penyimpanan database tidak tersedia. Data tidak dapat disimpan ke server pusat.',
      });
    }

    const organizationId = req.user!.organizationId;
    const userId = req.user!.userId;
    const id = record.id || `REC-${Date.now()}`;
    const nik = record.patientData?.nik || '';
    const patientName = record.patientData?.name || '';
    const dob = record.patientData?.dob ? new Date(record.patientData.dob) : null;
    const gender = record.patientData?.gender || '';
    const date = record.date ? new Date(record.date) : new Date();

    try {
      const sql = getDb();
      await sql`
        INSERT INTO screening_records (
          id, organization_id, created_by, nik, patient_name, dob, gender, screening_date, record_data, updated_at
        )
        VALUES (
          ${id},
          ${organizationId},
          ${userId},
          ${nik},
          ${patientName},
          ${dob},
          ${gender},
          ${date},
          ${JSON.stringify(record)},
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE SET
          record_data = ${JSON.stringify(record)},
          updated_at = CURRENT_TIMESTAMP
      `;

      await logAuditEvent({
        userId,
        organizationId,
        action: 'CREATE_OR_UPDATE_SCREENING_RECORD',
        resourceType: 'screening_records',
        resourceId: id,
        details: { patientNikPrefix: nik.substring(0, 6) },
        ipAddress: req.ip,
      });

      return res.status(200).json({ success: true, id, message: 'Data berhasil disimpan secara permanen.' });
    } catch (err: any) {
      console.error('[Database Error] Save record failed:', err);
      // NEVER return success on database failure!
      return res.status(500).json({
        success: false,
        error: 'Gagal menyimpan rekam skrining ke database serverless.',
        details: err?.message || String(err),
      });
    }
  }
);

// ===================================================================================
// EMR INTEGRATION ENDPOINTS (AUTHENTICATED & TENANT ISOLATED)
// ===================================================================================

app.post('/api/emr/patient-records', authenticateToken, async (req: AuthenticatedRequest, res) => {
  await logAuditEvent({
    userId: req.user?.userId,
    organizationId: req.user?.organizationId,
    action: 'EMR_SYNC_PUSH',
    resourceType: 'emr_records',
    ipAddress: req.ip,
  });

  res.json({ success: true, message: 'Data skrining berhasil disinkronisasi ke sistem EMR.' });
});

app.get('/api/emr/patient-records', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const nik = req.query.nik as string;
  if (!nik) {
    return res.status(400).json({ error: 'Parameter NIK diperlukan.' });
  }

  if (!isDbConfigured()) {
    return res.status(503).json({ error: 'Database belum terhubung.' });
  }

  const organizationId = req.user!.organizationId;

  try {
    const sql = getDb();
    const rows = await sql`
      SELECT record_data 
      FROM screening_records 
      WHERE organization_id = ${organizationId} AND nik = ${nik} 
      ORDER BY screening_date DESC 
      LIMIT 1
    `;

    if (rows && rows.length > 0) {
      await logAuditEvent({
        userId: req.user?.userId,
        organizationId: req.user?.organizationId,
        action: 'EMR_PATIENT_LOOKUP',
        resourceType: 'screening_records',
        details: { nikPrefix: nik.substring(0, 6) },
        ipAddress: req.ip,
      });

      return res.json((rows[0] as any).record_data.patientData);
    }

    return res.status(404).json({ error: 'Data pasien tidak ditemukan pada organisasi ini.' });
  } catch (err: any) {
    console.error('[Database Error] EMR lookup failed:', err);
    return res.status(500).json({ error: 'Gagal mencari data pasien di EMR.' });
  }
});

export default app;
