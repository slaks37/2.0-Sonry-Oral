import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { neon } from '@neondatabase/serverless';

const app = express();

// Support large payloads for oral photos (up to 50mb)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize GoogleGenAI server-side with required User-Agent
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
if (!apiKey) {
  console.warn('⚠️ [Sonri Warning] GEMINI_API_KEY is not set. Gemini API endpoints will return errors until an API key is provided.');
}

const ai = new GoogleGenAI({
  apiKey: apiKey || 'dummy-key',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Database connection via Neon Postgres
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const sql = databaseUrl ? neon(databaseUrl) : null;

// In-memory fallback store for records & EMR
let inMemoryRecords: any[] = [];

// Initialize table on startup if database is available
if (sql) {
  sql`
    CREATE TABLE IF NOT EXISTS screening_records (
      id VARCHAR(255) PRIMARY KEY,
      date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      nik VARCHAR(50),
      record_data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `.then(() => {
    console.log('✅ [Neon DB] Connected and screening_records table ready.');
  }).catch((err) => {
    console.warn('⚠️ [Neon DB] Initialization warning:', err?.message || err);
  });
}

const oralAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    issues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          diseaseName: {
            type: Type.STRING,
            enum: [
              'K02.51 Dental caries on pit and fissure surface, limited to enamel',
              'K02.52 Dental caries on pit and fissure surface penetrating into dentin',
              'K05.0 Acute gingivitis',
              'K00.4 Enamel hypoplasia',
              'K07.3 Anomalies of tooth position (Crowding)',
              'TP.01 TriPlaque: New Plaque (<48h)',
              'TP.02 TriPlaque: Old Plaque (>48h)',
              'TP.03 TriPlaque: Acidic Plaque (High Risk)',
            ],
          },
          description: { type: Type.STRING },
          boundingBox: {
            type: Type.OBJECT,
            properties: {
              x: { type: Type.NUMBER },
              y: { type: Type.NUMBER },
              width: { type: Type.NUMBER },
              height: { type: Type.NUMBER },
            },
            required: ['x', 'y', 'width', 'height'],
          },
        },
        required: ['diseaseName', 'description', 'boundingBox'],
      },
    },
    hygieneAssessment: { type: Type.STRING, enum: ['Good', 'Fair', 'Poor'] },
  },
  required: ['issues', 'hygieneAssessment'],
};

// Helper to call Gemini with primary model and automatic fallback across stable official models
async function generateGeminiContent(params: any) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server. Please set GEMINI_API_KEY in your environment variables.');
  }

  const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model,
      });
      return response;
    } catch (err: any) {
      console.warn(`Model ${model} failed, attempting next if available:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to generate content with Gemini');
}

// 1. API: Check Image Quality
app.post('/api/gemini/check-quality', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType || 'image/jpeg',
      },
    };

    const prompt = "Is this image clear enough for dental analysis? Check for excessive blurriness, darkness, or obstruction. Respond JSON with quality: 'good'|'poor' and reason.";

    const response = await generateGeminiContent({
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            quality: { type: Type.STRING },
            reason: { type: Type.STRING },
          },
          required: ['quality', 'reason'],
        },
      },
    });

    const result = JSON.parse(response.text?.trim() || '{}');
    return res.json(result);
  } catch (err: any) {
    console.error('Error in /api/gemini/check-quality:', err);
    return res.status(500).json({
      error: err?.message || 'Failed to check image quality. Please try again.',
      quality: 'good',
      reason: 'Could not perform remote quality check.',
    });
  }
});

// 2. API: Analyze Oral Image
app.post('/api/gemini/analyze-oral', async (req, res) => {
  try {
    const { imageBase64, mimeType, ageInYears, knowledgeBase } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType || 'image/jpeg',
      },
    };

    const prompt = `Analyze this oral image using ICD-10 and TriPlaque rules. Patient age: ${ageInYears || 'unknown'} years.
    
**IMPORTANT MEDICAL ETIQUETTE:**
This is a screening tool. You MUST NOT give a definitive diagnosis.
When describing findings, always use the prefix "Suspected as" (English) or "Diduga sebagai" (Indonesian) before naming the condition.

**TASKS:**
1. Check Enamel Hypoplasia (K00.4) - texture defects.
2. Check Crowding (K07.3) - overlapping teeth/narrow jaw.
3. TriPlaque: PINK (TP.01), PURPLE (TP.02), LIGHT BLUE (TP.03).
REFERENCE DATA: ${knowledgeBase || ''}`;

    const response = await generateGeminiContent({
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: oralAnalysisSchema,
      },
    });

    const result = JSON.parse(response.text?.trim() || '{"issues":[],"hygieneAssessment":"Fair"}');
    return res.json(result);
  } catch (err: any) {
    console.error('Error in /api/gemini/analyze-oral:', err);
    return res.status(500).json({
      error: err?.message || 'Gagal menganalisis gambar gigi dan mulut. Pastikan foto jelas dan coba lagi.',
    });
  }
});

// 3. API: Generate Final Report
app.post('/api/gemini/final-report', async (req, res) => {
  try {
    const { patientData, stuntingData, oralResults, metrics, language } = req.body;

    const allOralIssues = (oralResults || []).flat().map((o: any) => o.diseaseName).join(', ');

    const prompt = `Act as an AI Pediatric Nutritionist. Link oral data to stunting.
    
**RULES:**
- Use "Suspected as" or "Diduga sebagai" for all oral health findings.
- K07.3 (Crowding) = narrow jaw, chronic malnutrition sign.
- K00.4 (Hypoplasia) = 1000 days deficiency.
- K02 (Caries) = Cytokine Anorexia risk leading to Wasting.
Data: Patient ${patientData?.name || 'Child'}, Oral: ${allOralIssues || 'None'}, Metrics: ${JSON.stringify(metrics || {})}.
Language: ${language || 'id'}.`;

    const response = await generateGeminiContent({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nutritionResult: { type: Type.STRING },
            nutritionReason: { type: Type.STRING },
            oralResult: { type: Type.STRING },
            oralReason: { type: Type.STRING },
            conclusion: { type: Type.STRING },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['nutritionResult', 'nutritionReason', 'oralResult', 'oralReason', 'conclusion', 'recommendations'],
        },
      },
    });

    const reportJson = JSON.parse(response.text?.trim() || '{}');
    return res.json({
      ...metrics,
      ...reportJson,
    });
  } catch (err: any) {
    console.error('Error in /api/gemini/final-report:', err);
    return res.status(500).json({
      error: err?.message || 'Gagal menyusun laporan kesehatan terpadu. Silakan coba kembali.',
    });
  }
});

// 4. API: Screening Records (PostgreSQL + In-memory fallback)
app.get('/api/v1/screening-records', async (_req, res) => {
  if (sql) {
    try {
      const rows = await sql`
        SELECT record_data FROM screening_records ORDER BY created_at DESC
      `;
      const records = rows.map((r: any) => r.record_data);
      return res.json(records);
    } catch (err: any) {
      console.warn('[Neon DB] Query failed, falling back to in-memory store:', err?.message || err);
    }
  }
  res.json(inMemoryRecords);
});

app.post('/api/v1/screening-records', async (req, res) => {
  const record = req.body;
  if (!record) {
    return res.status(400).json({ error: 'Record body is required' });
  }

  // Always keep in-memory fallback sync
  inMemoryRecords.push(record);

  if (sql) {
    try {
      const id = record.id || `REC-${Date.now()}`;
      const nik = record.patientData?.nik || '';
      await sql`
        INSERT INTO screening_records (id, nik, record_data)
        VALUES (${id}, ${nik}, ${JSON.stringify(record)})
        ON CONFLICT (id) DO UPDATE SET record_data = ${JSON.stringify(record)}
      `;
    } catch (err: any) {
      console.error('[Neon DB] Save failed:', err?.message || err);
    }
  }

  res.json({ success: true });
});

// 5. API: EMR Integration
app.post('/api/emr/patient-records', (req, res) => {
  res.json({ success: true, message: 'Record received and acknowledged by simulated EMR' });
});

app.get('/api/emr/patient-records', async (req, res) => {
  const nik = req.query.nik as string;
  if (!nik) {
    return res.status(400).json({ error: 'NIK parameter is required' });
  }

  if (sql) {
    try {
      const rows = await sql`
        SELECT record_data FROM screening_records WHERE nik = ${nik} ORDER BY created_at DESC LIMIT 1
      `;
      if (rows && rows.length > 0) {
        return res.json((rows[0] as any).record_data.patientData);
      }
    } catch (err: any) {
      console.warn('[Neon DB] EMR lookup error:', err?.message || err);
    }
  }

  const match = inMemoryRecords.find((r) => r.patientData?.nik === nik);
  if (match) {
    return res.json(match.patientData);
  }
  return res.status(404).json({ error: 'Patient not found' });
});

export default app;
