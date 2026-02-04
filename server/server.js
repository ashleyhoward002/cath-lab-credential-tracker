const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const db = require('./database');
const { seedDatabase } = require('./seedData');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const isProduction = process.env.NODE_ENV === 'production';

// Trust Railway's reverse proxy (required for secure cookies over HTTPS)
if (isProduction) {
  app.set('trust proxy', 1);
}

// CORS configuration - allow same origin in production, localhost in dev
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (same-origin, mobile apps, curl)
    if (!origin) return callback(null, true);
    // In production, allow the Railway URL and localhost for dev
    callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'cath-lab-credential-tracker-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  proxy: process.env.NODE_ENV === 'production' // Trust proxy in production
}));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'staff', req.body.staff_id || 'temp');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only PDF, JPG, and PNG files are allowed'));
  }
});

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

const requireCoordinator = (req, res, next) => {
  if (!req.session.userId || req.session.userRole !== 'coordinator') {
    return res.status(403).json({ error: 'Forbidden - Coordinator access required' });
  }
  next();
};

// Helper function to log audit trail
function logAudit(userId, action, tableName, recordId, oldValue, newValue) {
  db.run(
    `INSERT INTO audit_log (user_id, action, table_name, record_id, old_value, new_value)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, action, tableName, recordId, JSON.stringify(oldValue), JSON.stringify(newValue)]
  );
}

// ===== AUTHENTICATION ROUTES =====

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.userRole = user.role;
    req.session.displayName = user.display_name;

    res.json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      title: user.title,
      role: user.role
    });
  });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Check session
app.get('/api/auth/session', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  db.get('SELECT id, username, display_name, title, role FROM users WHERE id = ?',
    [req.session.userId],
    (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: 'Session invalid' });
      }
      res.json({
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        title: user.title,
        role: user.role
      });
    }
  );
});

// ===== STAFF ROUTES =====

// Get all staff
app.get('/api/staff', requireAuth, (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM staff_members';
  let params = [];

  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY last_name, first_name';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get single staff member
app.get('/api/staff/:id', requireAuth, (req, res) => {
  db.get('SELECT * FROM staff_members WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Staff member not found' });
    }
    res.json(row);
  });
});

// Create staff member
app.post('/api/staff', requireCoordinator, (req, res) => {
  const {
    employee_id, first_name, last_name, email, phone, role, employment_type,
    hire_date, contract_start_date, contract_end_date, agency_name,
    agency_contact, home_state, status, notes
  } = req.body;

  db.run(
    `INSERT INTO staff_members
     (employee_id, first_name, last_name, email, phone, role, employment_type,
      hire_date, contract_start_date, contract_end_date, agency_name,
      agency_contact, home_state, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [employee_id, first_name, last_name, email, phone, role, employment_type,
     hire_date, contract_start_date, contract_end_date, agency_name,
     agency_contact, home_state, status || 'Active', notes],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create staff member' });
      }
      logAudit(req.session.userId, 'CREATE', 'staff_members', this.lastID, null, req.body);
      res.status(201).json({ id: this.lastID });
    }
  );
});

// Update staff member
app.put('/api/staff/:id', requireCoordinator, (req, res) => {
  const updates = req.body;
  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = [...Object.values(updates), req.params.id];

  db.get('SELECT * FROM staff_members WHERE id = ?', [req.params.id], (err, oldData) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    db.run(
      `UPDATE staff_members SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values,
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to update staff member' });
        }
        logAudit(req.session.userId, 'UPDATE', 'staff_members', req.params.id, oldData, updates);
        res.json({ message: 'Staff member updated successfully' });
      }
    );
  });
});

// Delete/Archive staff member
app.delete('/api/staff/:id', requireCoordinator, (req, res) => {
  db.run(
    'UPDATE staff_members SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    ['Archived', req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to archive staff member' });
      }
      logAudit(req.session.userId, 'ARCHIVE', 'staff_members', req.params.id, null, null);
      res.json({ message: 'Staff member archived successfully' });
    }
  );
});

// ===== CREDENTIAL TYPE ROUTES =====

// Get all credential types
app.get('/api/credential-types', requireAuth, (req, res) => {
  db.all('SELECT * FROM credential_types ORDER BY category, name', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get single credential type
app.get('/api/credential-types/:id', requireAuth, (req, res) => {
  db.get('SELECT * FROM credential_types WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Credential type not found' });
    }
    res.json(row);
  });
});

// Create credential type
app.post('/api/credential-types', requireCoordinator, (req, res) => {
  const {
    name, category, issuing_body, renewal_period_months, ceu_requirement,
    required_for, is_required, alert_days, verification_required, allow_multiple, instructions
  } = req.body;

  db.run(
    `INSERT INTO credential_types
     (name, category, issuing_body, renewal_period_months, ceu_requirement,
      required_for, is_required, alert_days, verification_required, allow_multiple, instructions)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, category, issuing_body, renewal_period_months, ceu_requirement,
     required_for, is_required, alert_days, verification_required, allow_multiple, instructions],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create credential type' });
      }
      logAudit(req.session.userId, 'CREATE', 'credential_types', this.lastID, null, req.body);
      res.status(201).json({ id: this.lastID });
    }
  );
});

// Update credential type
app.put('/api/credential-types/:id', requireCoordinator, (req, res) => {
  const updates = req.body;
  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = [...Object.values(updates), req.params.id];

  db.get('SELECT * FROM credential_types WHERE id = ?', [req.params.id], (err, oldData) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    db.run(
      `UPDATE credential_types SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values,
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to update credential type' });
        }
        logAudit(req.session.userId, 'UPDATE', 'credential_types', req.params.id, oldData, updates);
        res.json({ message: 'Credential type updated successfully' });
      }
    );
  });
});

// ===== STAFF CREDENTIALS ROUTES =====

// Get credentials for a specific staff member
app.get('/api/staff/:staffId/credentials', requireAuth, (req, res) => {
  const query = `
    SELECT
      sc.*,
      ct.name as credential_name,
      ct.category,
      ct.renewal_period_months,
      ct.ceu_requirement,
      ct.alert_days
    FROM staff_credentials sc
    JOIN credential_types ct ON sc.credential_type_id = ct.id
    WHERE sc.staff_id = ? AND sc.superseded = 0
    ORDER BY ct.category, ct.name
  `;

  db.all(query, [req.params.staffId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Assign credential to staff member
app.post('/api/staff/:staffId/credentials', requireCoordinator, (req, res) => {
  const { credential_type_id, issue_date, expiration_date, status, notes } = req.body;

  db.run(
    `INSERT INTO staff_credentials
     (staff_id, credential_type_id, issue_date, expiration_date, status, notes, verified_by, verified_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [req.params.staffId, credential_type_id, issue_date, expiration_date, status || 'Pending', notes, req.session.userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to assign credential' });
      }
      logAudit(req.session.userId, 'CREATE', 'staff_credentials', this.lastID, null, req.body);
      res.status(201).json({ id: this.lastID });
    }
  );
});

// Update staff credential
app.put('/api/staff-credentials/:id', requireCoordinator, (req, res) => {
  const updates = req.body;
  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = [...Object.values(updates), req.params.id];

  db.get('SELECT * FROM staff_credentials WHERE id = ?', [req.params.id], (err, oldData) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    db.run(
      `UPDATE staff_credentials SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values,
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to update credential' });
        }
        logAudit(req.session.userId, 'UPDATE', 'staff_credentials', req.params.id, oldData, updates);
        res.json({ message: 'Credential updated successfully' });
      }
    );
  });
});

// ===== DASHBOARD ROUTES =====

// Get dashboard statistics
app.get('/api/dashboard/stats', requireAuth, (req, res) => {
  const stats = {};

  // Total active staff
  db.get("SELECT COUNT(*) as count FROM staff_members WHERE status = 'Active'", (err, row) => {
    stats.activeStaff = row?.count || 0;

    // Expired credentials
    db.get(
      "SELECT COUNT(*) as count FROM staff_credentials WHERE status = 'Expired'",
      (err, row) => {
        stats.expired = row?.count || 0;

        // Expiring soon (within 30 days)
        db.get(
          `SELECT COUNT(*) as count FROM staff_credentials
           WHERE status = 'Expiring Soon'
           AND expiration_date <= date('now', '+30 days')`,
          (err, row) => {
            stats.expiringSoon30 = row?.count || 0;

            // Expiring within 90 days
            db.get(
              `SELECT COUNT(*) as count FROM staff_credentials
               WHERE status IN ('Active', 'Expiring Soon')
               AND expiration_date <= date('now', '+90 days')`,
              (err, row) => {
                stats.expiringSoon90 = row?.count || 0;

                res.json(stats);
              }
            );
          }
        );
      }
    );
  });
});

// Get upcoming expirations
app.get('/api/dashboard/upcoming-expirations', requireAuth, (req, res) => {
  const { days = 90 } = req.query;

  const query = `
    SELECT
      sc.*,
      sm.first_name,
      sm.last_name,
      sm.employee_id,
      ct.name as credential_name,
      ct.category,
      julianday(sc.expiration_date) - julianday('now') as days_until_expiration
    FROM staff_credentials sc
    JOIN staff_members sm ON sc.staff_id = sm.id
    JOIN credential_types ct ON sc.credential_type_id = ct.id
    WHERE sm.status = 'Active'
      AND sc.expiration_date IS NOT NULL
      AND sc.expiration_date <= date('now', '+' || ? || ' days')
      AND sc.superseded = 0
    ORDER BY sc.expiration_date ASC
  `;

  db.all(query, [days], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// ===== FILE UPLOAD ROUTES =====

// Upload document
app.post('/api/documents/upload', requireCoordinator, upload.single('document'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { staff_credential_id } = req.body;

  db.run(
    `INSERT INTO documents
     (staff_credential_id, file_name, file_path, file_size, file_type, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [staff_credential_id, req.file.originalname, req.file.path, req.file.size, req.file.mimetype, req.session.userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to save document record' });
      }
      res.status(201).json({
        id: this.lastID,
        fileName: req.file.originalname,
        filePath: req.file.path
      });
    }
  );
});

// Get documents for a credential
app.get('/api/staff-credentials/:id/documents', requireAuth, (req, res) => {
  db.all(
    `SELECT d.*, u.username as uploaded_by_name
     FROM documents d
     LEFT JOIN users u ON d.uploaded_by = u.id
     WHERE d.staff_credential_id = ?
     ORDER BY d.uploaded_at DESC`,
    [req.params.id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch documents' });
      }
      res.json(rows);
    }
  );
});

// ===== INITIALIZE DATABASE AND START SERVER =====

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

  // Handle client-side routing - serve index.html for all non-API routes
  app.get('{*path}', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

// Seed database on first run
db.get("SELECT COUNT(*) as count FROM credential_types", async (err, row) => {
  if (!err && row.count === 0) {
    console.log('Database is empty, seeding...');
    await seedDatabase();
  }
});

const HOST = isProduction ? '0.0.0.0' : 'localhost';
app.listen(PORT, HOST, () => {
  console.log(`\n✓ Server running on http://${HOST}:${PORT}`);
  console.log(`✓ Database: ${path.join(__dirname, '..', 'database', 'credentials.db')}`);
  console.log(`\nDefault credentials:`);
  console.log(`  Coordinator: coordinator / demo123`);
  console.log(`  Manager: manager / demo123\n`);
});
