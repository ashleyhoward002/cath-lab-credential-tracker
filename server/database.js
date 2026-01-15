const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const DB_PATH = path.join(__dirname, '..', 'database', 'credentials.db');

// Create database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database schema
function initializeDatabase() {
  db.serialize(() => {
    // Users table for authentication
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        title TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('coordinator', 'manager', 'staff')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Staff members table
    db.run(`
      CREATE TABLE IF NOT EXISTS staff_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Credential types (configurable templates)
    db.run(`
      CREATE TABLE IF NOT EXISTS credential_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('License', 'Certification', 'Competency', 'CEU', 'Other')),
        issuing_body TEXT,
        renewal_period_months INTEGER,
        ceu_requirement INTEGER DEFAULT 0,
        required_for TEXT NOT NULL DEFAULT 'All',
        is_required BOOLEAN NOT NULL DEFAULT 1,
        alert_days TEXT DEFAULT '90,60,30,14,7',
        verification_required BOOLEAN DEFAULT 1,
        allow_multiple BOOLEAN DEFAULT 0,
        instructions TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Staff credentials (assigned credentials)
    db.run(`
      CREATE TABLE IF NOT EXISTS staff_credentials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id INTEGER NOT NULL,
        credential_type_id INTEGER NOT NULL,
        issue_date DATE,
        expiration_date DATE,
        status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Active', 'Expiring Soon', 'Expired', 'Pending', 'Waived', 'N/A')),
        waived_reason TEXT,
        waived_until DATE,
        verified_by INTEGER,
        verified_date DATE,
        notes TEXT,
        superseded BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (staff_id) REFERENCES staff_members(id) ON DELETE CASCADE,
        FOREIGN KEY (credential_type_id) REFERENCES credential_types(id),
        FOREIGN KEY (verified_by) REFERENCES users(id)
      )
    `);

    // Documents table
    db.run(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_credential_id INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        file_type TEXT,
        uploaded_by INTEGER,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (staff_credential_id) REFERENCES staff_credentials(id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES users(id)
      )
    `);

    // CEU tracking table
    db.run(`
      CREATE TABLE IF NOT EXISTS ceu_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id INTEGER NOT NULL,
        date_completed DATE NOT NULL,
        course_title TEXT NOT NULL,
        provider TEXT,
        hours REAL NOT NULL,
        category TEXT,
        applies_to TEXT,
        verified BOOLEAN DEFAULT 0,
        verified_by INTEGER,
        verified_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (staff_id) REFERENCES staff_members(id) ON DELETE CASCADE,
        FOREIGN KEY (verified_by) REFERENCES users(id)
      )
    `);

    // Audit log table
    db.run(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        table_name TEXT NOT NULL,
        record_id INTEGER,
        old_value TEXT,
        new_value TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Create default users
    createDefaultUsers();
  });
}

// Create default coordinator and manager accounts
async function createDefaultUsers() {
  const coordinatorPassword = await bcrypt.hash('demo123', 10);
  const managerPassword = await bcrypt.hash('demo123', 10);

  db.run(`
    INSERT OR IGNORE INTO users (username, password_hash, display_name, title, role)
    VALUES ('coordinator', ?, 'Education Coordinator', 'Education Coordinator', 'coordinator')
  `, [coordinatorPassword]);

  db.run(`
    INSERT OR IGNORE INTO users (username, password_hash, display_name, title, role)
    VALUES ('manager', ?, 'Department Manager', 'Department Manager', 'manager')
  `, [managerPassword], (err) => {
    if (!err) {
      console.log('Default users created');
    }
  });
}

module.exports = db;
