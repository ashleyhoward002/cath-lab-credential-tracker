const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const { pool } = require('../database');
const { requireAuth, requireCoordinator, requireManager } = require('../middleware/auth');
const { logAudit } = require('../helpers');

// Memory storage for Excel file uploads (no need to persist)
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /xlsx|xls/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    if (extname) {
      return cb(null, true);
    }
    cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
  }
});

const router = express.Router();

// Get all staff
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM staff_members';
    let params = [];
    let paramIndex = 1;

    // Staff users only see their own record
    if (req.session.userRole === 'staff') {
      if (!req.session.staffMemberId) {
        return res.json([]);
      }
      query += ` WHERE id = $${paramIndex}`;
      params.push(req.session.staffMemberId);
      paramIndex++;
      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
    } else if (status) {
      query += ` WHERE status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ' ORDER BY last_name, first_name';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Get staff error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get single staff member
router.get('/:id', requireAuth, async (req, res) => {
  try {
    // Staff users can only view their own record
    if (req.session.userRole === 'staff' && req.session.staffMemberId !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { rows } = await pool.query('SELECT * FROM staff_members WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Staff member not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Get staff member error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create staff member
router.post('/', requireCoordinator, async (req, res) => {
  try {
    const {
      employee_id, first_name, last_name, email, phone, role, employment_type,
      hire_date, contract_start_date, contract_end_date, agency_name,
      agency_contact, home_state, status, notes
    } = req.body;

    // Convert empty date strings to null for PostgreSQL
    const hireDateValue = hire_date || null;
    const contractStartValue = contract_start_date || null;
    const contractEndValue = contract_end_date || null;

    const { rows } = await pool.query(
      `INSERT INTO staff_members
       (employee_id, first_name, last_name, email, phone, role, employment_type,
        hire_date, contract_start_date, contract_end_date, agency_name,
        agency_contact, home_state, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id`,
      [employee_id, first_name, last_name, email, phone, role, employment_type,
       hireDateValue, contractStartValue, contractEndValue, agency_name,
       agency_contact, home_state, status || 'Active', notes]
    );

    logAudit(req.session.userId, 'CREATE', 'staff_members', rows[0].id, null, req.body);
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error('Create staff error:', err);
    res.status(500).json({ error: 'Failed to create staff member: ' + err.message });
  }
});

// Update staff member
router.put('/:id', requireManager, async (req, res) => {
  try {
    const updates = { ...req.body };
    // Convert empty date strings to null for PostgreSQL
    ['hire_date', 'contract_start_date', 'contract_end_date'].forEach(field => {
      if (updates[field] === '') updates[field] = null;
    });
    const keys = Object.keys(updates);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = [...Object.values(updates), req.params.id];

    // Get old data for audit
    const old = await pool.query('SELECT * FROM staff_members WHERE id = $1', [req.params.id]);

    await pool.query(
      `UPDATE staff_members SET ${setClause}, updated_at = NOW() WHERE id = $${keys.length + 1}`,
      values
    );

    logAudit(req.session.userId, 'UPDATE', 'staff_members', req.params.id, old.rows[0], updates);
    res.json({ message: 'Staff member updated successfully' });
  } catch (err) {
    console.error('Update staff error:', err);
    res.status(500).json({ error: 'Failed to update staff member' });
  }
});

// Archive staff member
router.delete('/:id', requireCoordinator, async (req, res) => {
  try {
    await pool.query(
      "UPDATE staff_members SET status = 'Archived', updated_at = NOW() WHERE id = $1",
      [req.params.id]
    );

    logAudit(req.session.userId, 'ARCHIVE', 'staff_members', req.params.id, null, null);
    res.json({ message: 'Staff member archived successfully' });
  } catch (err) {
    console.error('Archive staff error:', err);
    res.status(500).json({ error: 'Failed to archive staff member' });
  }
});

// Permanently delete staff member
router.delete('/:id/permanent', requireCoordinator, async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM staff_members WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    // CASCADE will handle staff_credentials, documents, and ceu_entries
    await pool.query('DELETE FROM staff_members WHERE id = $1', [req.params.id]);

    logAudit(req.session.userId, 'DELETE', 'staff_members', req.params.id, existing.rows[0], null);
    res.json({ message: 'Staff member permanently deleted' });
  } catch (err) {
    console.error('Delete staff error:', err);
    res.status(500).json({ error: 'Failed to delete staff member' });
  }
});

// ===== STAFF CREDENTIALS (nested under /api/staff/:staffId/credentials) =====

// Get credentials for a staff member
router.get('/:staffId/credentials', requireAuth, async (req, res) => {
  try {
    if (req.session.userRole === 'staff' && req.session.staffMemberId !== parseInt(req.params.staffId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { rows } = await pool.query(
      `SELECT sc.*, ct.name as credential_name, ct.category,
              ct.renewal_period_months, ct.ceu_requirement, ct.alert_days
       FROM staff_credentials sc
       JOIN credential_types ct ON sc.credential_type_id = ct.id
       WHERE sc.staff_id = $1 AND sc.superseded = false
       ORDER BY ct.category, ct.name`,
      [req.params.staffId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get staff credentials error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Assign credential to staff member
router.post('/:staffId/credentials', requireManager, async (req, res) => {
  try {
    const { credential_type_id, issue_date, expiration_date, status, notes } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO staff_credentials
       (staff_id, credential_type_id, issue_date, expiration_date, status, notes, verified_by, verified_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id`,
      [req.params.staffId, credential_type_id, issue_date, expiration_date, status || 'Pending', notes, req.session.userId]
    );

    logAudit(req.session.userId, 'CREATE', 'staff_credentials', rows[0].id, null, req.body);
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error('Assign credential error:', err);
    res.status(500).json({ error: 'Failed to assign credential' });
  }
});

// ===== EXCEL IMPORT =====

// Parse uploaded Excel file and return preview data
router.post('/import/preview', requireCoordinator, excelUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse the Excel file from buffer
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON with headers
    const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (rawData.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    // Expected column mappings (flexible - handles different header names)
    const columnMappings = {
      employee_id: ['employee_id', 'employee id', 'emp_id', 'emp id', 'id', 'employeeid', 'employee #', 'employee number', 'emp #'],
      full_name: ['name', 'full name', 'full_name', 'fullname', 'staff name', 'employee name'],
      first_name: ['first_name', 'first name', 'firstname', 'first', 'fname', 'given name'],
      last_name: ['last_name', 'last name', 'lastname', 'last', 'lname', 'surname', 'family name'],
      email: ['email', 'e-mail', 'email address'],
      phone: ['phone', 'phone number', 'telephone', 'tel', 'mobile', 'cell', 'contact', 'phone #'],
      role: ['role', 'position', 'job title', 'title', 'job role'],
      employment_type: ['employment_type', 'employment type', 'type', 'emp type', 'employee type'],
      hire_date: ['hire_date', 'hire date', 'hiredate', 'start date', 'date hired', 'date of hire'],
      home_state: ['home_state', 'home state', 'state', 'license state'],
      notes: ['notes', 'note', 'comments', 'comment', 'remarks']
    };

    // Helper to find matching column in row
    const findColumn = (row, possibleNames) => {
      const keys = Object.keys(row);
      // First: exact match (case-insensitive, trimmed)
      for (const name of possibleNames) {
        const key = keys.find(k => k.toLowerCase().trim() === name);
        if (key !== undefined) return row[key];
      }
      // Second: contains match for longer aliases (4+ chars) to avoid false positives
      for (const name of possibleNames) {
        if (name.length < 4) continue;
        const key = keys.find(k => k.toLowerCase().trim().includes(name));
        if (key !== undefined) return row[key];
      }
      return '';
    };

    // Get actual column headers from the Excel file
    const excelHeaders = rawData.length > 0 ? Object.keys(rawData[0]) : [];

    // Map and validate the data
    const parsedStaff = rawData.map((row, index) => {
      const staff = {
        row_number: index + 2, // +2 because row 1 is headers, and we're 0-indexed
        employee_id: String(findColumn(row, columnMappings.employee_id)).trim(),
        first_name: String(findColumn(row, columnMappings.first_name)).trim(),
        last_name: String(findColumn(row, columnMappings.last_name)).trim(),
        email: String(findColumn(row, columnMappings.email)).trim(),
        phone: String(findColumn(row, columnMappings.phone)).trim(),
        role: String(findColumn(row, columnMappings.role)).trim(),
        employment_type: String(findColumn(row, columnMappings.employment_type)).trim() || 'Permanent',
        hire_date: findColumn(row, columnMappings.hire_date),
        home_state: String(findColumn(row, columnMappings.home_state)).trim(),
        notes: String(findColumn(row, columnMappings.notes)).trim(),
        errors: [],
        warnings: []
      };

      // If first_name and last_name are both empty, try combined name column
      if (!staff.first_name && !staff.last_name) {
        const fullName = String(findColumn(row, columnMappings.full_name)).trim();
        if (fullName) {
          const nameParts = fullName.split(/[\s,]+/).filter(Boolean);
          if (nameParts.length >= 2) {
            if (fullName.includes(',')) {
              // "Last, First" format
              staff.last_name = nameParts[0];
              staff.first_name = nameParts.slice(1).join(' ');
            } else {
              // "First Last" format
              staff.first_name = nameParts[0];
              staff.last_name = nameParts.slice(1).join(' ');
            }
          } else if (nameParts.length === 1) {
            staff.first_name = nameParts[0];
            staff.warnings.push('Only one name provided; last name left empty');
          }
        }
      }

      // Auto-generate employee_id if not provided
      if (!staff.employee_id) {
        staff.warnings.push('No employee ID found; will be auto-generated on import');
      }

      // Validate required fields
      if (!staff.first_name) staff.errors.push('First name is required');
      if (!staff.last_name) staff.errors.push('Last name is required');

      // Validate role - provide suggestions
      const validRoles = ['RN', 'Tech', 'RT', 'EP Tech'];
      if (staff.role && !validRoles.includes(staff.role)) {
        staff.warnings.push(`Role "${staff.role}" not recognized. Valid roles: ${validRoles.join(', ')}`);
      }

      // Validate employment type
      const validTypes = ['Permanent', 'Traveler', 'PRN', 'Float'];
      if (staff.employment_type && !validTypes.includes(staff.employment_type)) {
        staff.warnings.push(`Employment type "${staff.employment_type}" not recognized. Valid types: ${validTypes.join(', ')}`);
      }

      // Parse date if present
      if (staff.hire_date) {
        const parsed = parseExcelDate(staff.hire_date);
        if (parsed) {
          staff.hire_date = parsed;
        } else {
          staff.warnings.push('Could not parse hire date');
          staff.hire_date = '';
        }
      }

      return staff;
    });

    // Check for duplicate employee IDs within the import
    const employeeIds = parsedStaff.filter(s => s.employee_id).map(s => s.employee_id);
    const duplicateIds = employeeIds.filter((id, index) => employeeIds.indexOf(id) !== index);
    parsedStaff.forEach(staff => {
      if (staff.employee_id && duplicateIds.includes(staff.employee_id)) {
        staff.warnings.push('Duplicate employee ID in import');
      }
    });

    // Check for existing employee IDs in database
    const existingIds = await pool.query(
      'SELECT employee_id FROM staff_members WHERE employee_id = ANY($1)',
      [employeeIds.filter(id => id)]
    );
    const existingIdSet = new Set(existingIds.rows.map(r => r.employee_id));
    parsedStaff.forEach(staff => {
      if (staff.employee_id && existingIdSet.has(staff.employee_id)) {
        staff.warnings.push('Employee ID already exists in system');
      }
    });

    res.json({
      total: parsedStaff.length,
      valid: parsedStaff.filter(s => s.errors.length === 0).length,
      withErrors: parsedStaff.filter(s => s.errors.length > 0).length,
      withWarnings: parsedStaff.filter(s => s.warnings.length > 0 && s.errors.length === 0).length,
      headers: excelHeaders,
      staff: parsedStaff
    });
  } catch (err) {
    console.error('Excel preview error:', err);
    res.status(500).json({ error: 'Failed to parse Excel file: ' + err.message });
  }
});

// Helper to parse Excel dates (can be number or string)
function parseExcelDate(value) {
  if (!value) return null;

  // If it's an Excel serial number
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }

  // Try parsing as string date
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

// Import staff members from validated data
router.post('/import/confirm', requireCoordinator, async (req, res) => {
  try {
    const { staff } = req.body;

    if (!staff || !Array.isArray(staff) || staff.length === 0) {
      return res.status(400).json({ error: 'No staff data provided' });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const member of staff) {
      try {
        // Skip rows with errors
        if (member.errors && member.errors.length > 0) {
          results.failed++;
          results.errors.push({ row: member.row_number, error: member.errors.join(', ') });
          continue;
        }

        const hireDateValue = member.hire_date || null;

        // Auto-generate employee_id if not provided
        let employeeId = member.employee_id;
        if (!employeeId) {
          const initials = ((member.first_name || '').charAt(0) + (member.last_name || '').charAt(0)).toUpperCase();
          const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
          const random = Math.random().toString(36).slice(2, 5).toUpperCase();
          employeeId = `${initials}${timestamp}${random}`;
        }

        const { rows } = await pool.query(
          `INSERT INTO staff_members
           (employee_id, first_name, last_name, email, phone, role, employment_type,
            hire_date, home_state, status, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id`,
          [
            employeeId,
            member.first_name,
            member.last_name,
            member.email || null,
            member.phone || null,
            member.role || null,
            member.employment_type || 'Permanent',
            hireDateValue,
            member.home_state || null,
            'Active',
            member.notes || null
          ]
        );

        logAudit(req.session.userId, 'CREATE', 'staff_members', rows[0].id, null, { ...member, source: 'excel_import' });
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ row: member.row_number, error: err.message });
      }
    }

    res.json(results);
  } catch (err) {
    console.error('Excel import error:', err);
    res.status(500).json({ error: 'Failed to import staff: ' + err.message });
  }
});

module.exports = router;
