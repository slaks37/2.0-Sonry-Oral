import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';

export const getDb = () => {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured. Database operations cannot proceed without a valid connection string.');
  }
  return neon(databaseUrl);
};

export const isDbConfigured = (): boolean => Boolean(databaseUrl);

/**
 * Ensures schema migration and default seed organization exist.
 */
export async function initDatabase(): Promise<void> {
  if (!isDbConfigured()) {
    console.warn('⚠️ [Database Warning] DATABASE_URL is not configured. Database migrations skipped.');
    return;
  }

  const sql = getDb();

  // Create tables idempotently
  await sql`
    CREATE TABLE IF NOT EXISTS organizations (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50) UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'health_worker',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS screening_records (
      id VARCHAR(255) PRIMARY KEY,
      organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id),
      created_by VARCHAR(255) REFERENCES users(id),
      nik VARCHAR(50) NOT NULL,
      patient_name VARCHAR(255),
      dob DATE,
      gender VARCHAR(20),
      screening_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      record_data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255),
      organization_id VARCHAR(255),
      action VARCHAR(100) NOT NULL,
      resource_type VARCHAR(50) NOT NULL,
      resource_id VARCHAR(255),
      details JSONB,
      ip_address VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_screening_org_date ON screening_records(organization_id, screening_date DESC);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_screening_nik ON screening_records(organization_id, nik);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(organization_id, created_at DESC);`;

  // Seed default organization if not exists
  await sql`
    INSERT INTO organizations (id, name, code)
    VALUES ('org_default', 'Puskesmas / Posyandu Terpadu', 'POS-001')
    ON CONFLICT (id) DO NOTHING;
  `;

  console.log('✅ [Database] PostgreSQL schema and seed verified.');
}
