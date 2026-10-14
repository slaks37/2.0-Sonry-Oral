# DEPLOYMENT CHECKLIST & OPERATIONAL RUNBOOK
**System:** SONRI ORALYTIC AI 2.0  
**Target Environment:** Vercel Serverless + Neon PostgreSQL  
**Release Candidate:** `v2.0.0-RC1`

---

## 1. Pre-Deployment Configuration Gate

Before authorizing production deployment, verify all required server-side environment variables in the Vercel Dashboard (`Settings -> Environment Variables`):

- [ ] `AGNES_BASE_URL` = `https://apihub.agnes-ai.com/v1`
- [ ] `AGNES_MODEL` = `agnes-2.5-flash`
- [ ] `AGNES_API_KEY` = `<configured server secret>`
- [ ] `DATABASE_URL` = `postgresql://<user>:<password>@<neon-host>/neondb?sslmode=require`
- [ ] `JWT_SECRET` = `<min-32-char-random-secret>`
- [ ] `NODE_ENV` = `production`

---

## 2. Automated Quality Gate

Run all verification suites locally prior to merging pull request:
```bash
# 1. Typecheck & Lint
npm run lint

# 2. Automated Tests (Clinical calculations, AI parser, Auth & Security)
npm test

# 3. Production Build
npm run build
```
Criteria for approval:
- 0 TypeScript compilation errors
- 38/38 passing unit and integration tests
- Optimized vendor chunk splitting (all chunks under 600kB)

---

## 3. Database Migration Execution

Database migrations are executed idempotently on cold start via `initDatabase()` in `services/db.ts`, or can be run manually using `psql`:
```bash
psql $DATABASE_URL -f migrations/001_initial_schema.sql
```

Verify tables created:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- Expected: organizations, users, screening_records, audit_logs
```

---

## 4. Post-Deployment Verification (Smoke Test)

1. **System Health Check:**
   ```bash
   curl -s https://<your-domain>/api/health
   # Expected: {"status":"healthy","aiProvider":{...},"database":{"configured":true,"connected":true}}
   ```
2. **Authentication Flow:**
   - Sign up new health worker via `/signup`.
   - Log in with credentials and verify JWT session token.
3. **Anthropometric Screening:**
   - Input patient data for a 12-month child (Height: 75.7cm, Weight: 9.6kg).
   - Verify Z-scores calculate as Normal.
4. **Oral Screening:**
   - Upload oral image.
   - Verify quality check gate passes or presents actionable retake advice.
   - Verify report generates with disclaimers and observational prefixes.
5. **Persistence Verification:**
   - Click "Save Record".
   - Refresh browser and open Dashboard; verify record is durably stored in PostgreSQL.
