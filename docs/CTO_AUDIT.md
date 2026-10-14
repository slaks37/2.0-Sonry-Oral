# CTO AUDIT REPORT
**Project:** SONRI ORALYTIC AI 2.0  
**Repository:** https://github.com/slaks37/2.0-Sonry-Oral  
**Lead Auditor:** Principal CTO & Security Architect  
**Date:** 2026-10-14  
**Audit Scope:** Full Application Baseline, Security, Reliability, Clinical Standards, and Architecture

---

## 1. Executive Baseline Findings

| Area | Initial Status | Risk Level | Remediated Status |
| :--- | :--- | :--- | :--- |
| **Authentication & RBAC** | Mock login in React state (`localStorage.getItem('sonri_session')`); no server-side auth or password hashing | **CRITICAL (P0)** | Production JWT auth, bcrypt password hashing, 5 RBAC roles, tenant isolation |
| **Database Persistence** | False success return `{ success: true }` when PostgreSQL insert failed; in-memory fallback in serverless | **CRITICAL (P0)** | Durable PostgreSQL writes, migration schemas, explicit error throwing, offline draft queue |
| **AI Runtime Provider** | Hardcoded Google Gemini SDK (`@google/genai`); false `good` image quality default on failure | **HIGH (P1)** | Migrated to Agnes AI (`agnes-2.5-flash`), modular provider, Zod validation, `unable_to_assess` fail-safe |
| **Clinical Growth Engine** | Sparse WHO tables with missing months (interpolated via `findClosestKeyData`); no recumbent length check | **HIGH (P1)** | Complete WHO 2006/2007 standards (0-60m, 5-19y), verified LMS math, boundary tests |
| **Data Privacy (EMR / PII)** | Unauthenticated `/api/emr/patient-records` endpoint allowing unrestricted NIK querying | **CRITICAL (P0)** | Authenticated endpoints, tenant-isolated lookups, audit logging, zero PII logging |
| **Frontend Bug Fixes** | "New Screening" reset to Landing page; CSV formula injection; mobile PDF failure; memory leaks | **MEDIUM (P2)** | All 16 targeted bugs remediated, RFC 4180 multiline CSV parser, camera track cleanup |

---

## 2. Architecture & Entry Points

```
Client (Vite 6 + React 19 + TypeScript)
   ├── Entry: index.html -> index.tsx -> App.tsx
   ├── Route/Screen State Machine: HOME -> LOGIN/SIGNUP -> LANDING -> STUNTING_SCREENING -> ORAL_EXAM -> ANALYZING -> REPORT -> DASHBOARD
   └── Auth Context: Bearer JWT in localStorage ('sonri_token')
       │
       ▼
Vercel Serverless / Node.js Runtime (Express 5.3)
   ├── Entry: server.ts -> api/index.ts
   ├── Security Headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
   ├── Routing Rewrites: /api -> api/index.ts, /api/* -> api/index.ts, /* -> index.html (SPA)
   │
   ├── AI Provider Layer (services/ai/)
   │   ├── Provider Interface: AIProvider
   │   ├── Concrete Provider: AgnesProvider (POST /v1/chat/completions)
   │   ├── Schemas & Normalization: Zod (0-100% bounding box clamping)
   │   └── Prompts: 3-layer decoupled clinical etiquette
   │
   └── Storage Layer (services/db.ts)
       ├── Provider: Neon PostgreSQL Serverless
       ├── Migrations: migrations/001_initial_schema.sql
       └── Tables: organizations, users, screening_records, audit_logs
```

---

## 3. Risk Assessment & Remediation Priority

1. **P0 - Tenant Isolation & Data Leakage (Remediated):**
   - Previous state: Screening records returned to anyone calling `GET /api/v1/screening-records`.
   - New state: Endpoint strictly requires `authenticateToken`. Records filtered by `WHERE organization_id = ${req.user.organizationId}`.

2. **P0 - Data Loss & False Success (Remediated):**
   - Previous state: Database write failure caught silently, returning `{ success: true }`.
   - New state: Returns HTTP 500 with descriptive error. Saves to offline draft queue on device if server is unreachable.

3. **P1 - AI Hallucination & Erroneous Diagnosis (Remediated):**
   - Previous state: Direct causal assertions in prompts (e.g. crowding = malnutrition).
   - New state: Strict clinical screening disclaimer; mandatory "Diduga sebagai" / "Suspected as" prefix; decoupled Layer A/B/C.
