const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const config = require('./config');

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.isProduction ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        title TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('coordinator', 'manager', 'staff')),
        email TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        staff_member_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS staff_members (
        id SERIAL PRIMARY KEY,
        employee_id TEXT UNIQUE NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        role TEXT NOT NULL,
        employment_type TEXT NOT NULL CHECK(employment_type IN ('Permanent', 'Traveler', 'PRN', 'Float')),
        hire_date DATE,
        contract_start_date DATE,
        contract_end_date DATE,
        agency_name TEXT,
        agency_contact TEXT,
        home_state TEXT,
        status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Inactive', 'Archived')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add foreign key to users after staff_members exists
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_users_staff_member'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT fk_users_staff_member
            FOREIGN KEY (staff_member_id) REFERENCES staff_members(id) ON DELETE SET NULL;
        END IF;
      END $$
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS credential_types (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('License', 'Certification', 'Competency', 'CEU', 'Other')),
        issuing_body TEXT,
        renewal_period_months INTEGER,
        ceu_requirement INTEGER DEFAULT 0,
        required_for TEXT NOT NULL DEFAULT 'All',
        is_required BOOLEAN NOT NULL DEFAULT true,
        alert_days TEXT DEFAULT '90,60,30,14,7',
        verification_required BOOLEAN DEFAULT true,
        allow_multiple BOOLEAN DEFAULT false,
        instructions TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS staff_credentials (
        id SERIAL PRIMARY KEY,
        staff_id INTEGER NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
        credential_type_id INTEGER NOT NULL REFERENCES credential_types(id),
        issue_date DATE,
        expiration_date DATE,
        status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Active', 'Expiring Soon', 'Expired', 'Pending', 'Waived', 'N/A')),
        waived_reason TEXT,
        waived_until DATE,
        verified_by INTEGER REFERENCES users(id),
        verified_date DATE,
        notes TEXT,
        superseded BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        staff_credential_id INTEGER NOT NULL REFERENCES staff_credentials(id) ON DELETE CASCADE,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        file_type TEXT,
        uploaded_by INTEGER REFERENCES users(id),
        uploaded_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ceu_entries (
        id SERIAL PRIMARY KEY,
        staff_id INTEGER NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
        date_completed DATE NOT NULL,
        course_title TEXT NOT NULL,
        provider TEXT,
        hours REAL NOT NULL,
        category TEXT,
        applies_to TEXT,
        verified BOOLEAN DEFAULT false,
        verified_by INTEGER REFERENCES users(id),
        verified_date DATE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action TEXT NOT NULL,
        table_name TEXT NOT NULL,
        record_id INTEGER,
        old_value TEXT,
        new_value TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query('COMMIT');
    console.log('Database schema initialized');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function createDefaultUsers() {
  const { rows } = await pool.query('SELECT COUNT(*) as count FROM users');
  if (parseInt(rows[0].count) > 0) return;

  const coordinatorHash = await bcrypt.hash('demo123', 10);
  const managerHash = await bcrypt.hash('demo123', 10);

  await pool.query(
    `INSERT INTO users (username, password_hash, display_name, title, role)
     VALUES ($1, $2, $3, $4, $5) ON CONFLICT (username) DO NOTHING`,
    ['coordinator', coordinatorHash, 'Education Coordinator', 'Education Coordinator', 'coordinator']
  );

  await pool.query(
    `INSERT INTO users (username, password_hash, display_name, title, role)
     VALUES ($1, $2, $3, $4, $5) ON CONFLICT (username) DO NOTHING`,
    ['manager', managerHash, 'Department Manager', 'Department Manager', 'manager']
  );

  console.log('Default demo users created');
}

module.exports = { pool, initializeDatabase, createDefaultUsers };
