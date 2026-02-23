const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const { pool } = require('../database');
const { requireCoordinator } = require('../middleware/auth');
const { logAudit } = require('../helpers');

const router = express.Router();

// Memory storage for Excel file uploads
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /xlsx|xls/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    if (extname) {
      return cb(null, true);
    }
    cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
  }
});

// Role group header patterns (case-insensitive)
const ROLE_GROUP_PATTERNS = {
  'RCIS': ['rcis', 'tech', 'technologist', 'cardiovascular tech'],
  'RN': ['rn', 'registered nurse', 'nurse'],
  'Miscellaneous': ['miscellaneous', 'misc', 'agency', 'other', 'miscellaneous/agency']
};

// Known credential columns that have expiration dates (need renewal tracking)
const EXPIRING_CREDENTIAL_PATTERNS = [
  { pattern: /license/i, suggestedName: 'State License', category: 'License' },
  { pattern: /acls/i, suggestedName: 'ACLS', category: 'Certification' },
  { pattern: /bls/i, suggestedName: 'BLS', category: 'Certification' },
  { pattern: /pals/i, suggestedName: 'PALS', category: 'Certification' },
];

// Known competency columns (one-time completion, no expiration)
const COMPETENCY_PATTERNS = [
  'angiojet', 'impella', 'ivus', 'ffr', 'volcano', 'iabp', 'shockwave', 'ekos',
  'loop recorder', 'penumbra', 'flow triever', 'tandem', 'tr band', 'tvp',
  'defibrillator', 'abbott', 'biotronik', 'papyrus', 'carto', 'inservice'
];

/**
 * Parse Excel date value - handles various formats
 */
function parseExcelDate(value, warnings = []) {
  if (!value) return null;

  // If it's an Excel serial number
  if (typeof value === 'number') {
    try {
      const date = XLSX.SSF.parse_date_code(value);
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      }
    } catch (e) {
      warnings.push(`Could not parse Excel date number: ${value}`);
    }
  }

  // If it's already a Date object
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  // String date parsing
  if (typeof value === 'string') {
    const str = value.trim();

    // Handle common typos like "6/302025" -> "6/30/2025"
    const typoMatch = str.match(/^(\d{1,2})\/(\d{1,2})(\d{4})$/);
    if (typoMatch) {
      const [, month, day, year] = typoMatch;
      const fixed = `${month}/${day}/${year}`;
      const parsed = new Date(fixed);
      if (!isNaN(parsed.getTime())) {
        warnings.push(`Fixed date typo: "${str}" -> "${fixed}"`);
        return parsed.toISOString().split('T')[0];
      }
    }

    // Try standard date parsing
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    // Try MM/DD/YYYY format explicitly
    const mmddyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (mmddyyyy) {
      let [, month, day, year] = mmddyyyy;
      if (year.length === 2) {
        year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
      }
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }

    warnings.push(`Could not parse date: "${str}"`);
  }

  return null;
}

/**
 * Detect if a row is a role group header
 */
function detectRoleGroupHeader(row) {
  const firstCell = String(row[Object.keys(row)[0]] || '').toLowerCase().trim();

  for (const [role, patterns] of Object.entries(ROLE_GROUP_PATTERNS)) {
    if (patterns.some(p => firstCell.includes(p) || firstCell === p)) {
      return role;
    }
  }
  return null;
}

/**
 * Check if a row is empty or a header/title row
 */
function isEmptyOrHeaderRow(row, headers) {
  // Check if all values are empty
  const values = Object.values(row).map(v => String(v || '').trim());
  if (values.every(v => !v)) return true;

  // Check if first cell matches a known role group
  if (detectRoleGroupHeader(row)) return true;

  return false;
}

/**
 * Classify a column as credential (expiring) or competency (one-time)
 */
function classifyColumn(headerName) {
  const lower = headerName.toLowerCase();

  // Check expiring credentials first
  for (const { pattern, suggestedName, category } of EXPIRING_CREDENTIAL_PATTERNS) {
    if (pattern.test(headerName)) {
      return { type: 'credential', suggestedName, category, isExpiring: true };
    }
  }

  // Check competencies
  for (const pattern of COMPETENCY_PATTERNS) {
    if (lower.includes(pattern)) {
      return { type: 'competency', suggestedName: headerName, category: 'Competency', isExpiring: false };
    }
  }

  return null;
}

// ===== ANALYZE ENDPOINT =====
// Returns spreadsheet structure for mapping configuration
router.post('/analyze', requireCoordinator, excelUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Get raw data with headers
    const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

    if (rawData.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    const headers = Object.keys(rawData[0]);

    // Analyze columns
    const columnAnalysis = headers.map((header, index) => {
      const classification = classifyColumn(header);
      const sampleValues = rawData
        .slice(0, 10)
        .map(row => row[header])
        .filter(v => v && String(v).trim());

      return {
        index,
        header,
        classification,
        sampleValues: sampleValues.slice(0, 5),
        hasData: sampleValues.length > 0
      };
    });

    // Detect role groups and count staff
    let currentRole = 'Unknown';
    const roleGroups = {};
    const staffPreview = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];

      // Check for role group header
      const detectedRole = detectRoleGroupHeader(row);
      if (detectedRole) {
        currentRole = detectedRole;
        if (!roleGroups[currentRole]) {
          roleGroups[currentRole] = { count: 0, startRow: i + 2 };
        }
        continue;
      }

      // Skip empty rows
      if (isEmptyOrHeaderRow(row, headers)) continue;

      // This is a staff row
      const nameCol = headers[0]; // Assuming name is first column
      const name = String(row[nameCol] || '').trim();

      if (name) {
        if (!roleGroups[currentRole]) {
          roleGroups[currentRole] = { count: 0, startRow: i + 2 };
        }
        roleGroups[currentRole].count++;

        if (staffPreview.length < 10) {
          staffPreview.push({
            row: i + 2,
            name,
            role: currentRole,
            sampleData: Object.fromEntries(
              headers.slice(0, 6).map(h => [h, row[h]])
            )
          });
        }
      }
    }

    // Get existing credential types for mapping
    const { rows: credentialTypes } = await pool.query(
      'SELECT id, name, category, renewal_period_months FROM credential_types ORDER BY category, name'
    );

    res.json({
      fileName: req.file.originalname,
      sheetName,
      totalRows: rawData.length,
      headers,
      columnAnalysis,
      roleGroups,
      staffPreview,
      existingCredentialTypes: credentialTypes
    });

  } catch (err) {
    console.error('Excel analyze error:', err);
    res.status(500).json({ error: 'Failed to analyze Excel file: ' + err.message });
  }
});

// ===== PREVIEW ENDPOINT =====
// Parse with column mapping and return full preview
router.post('/preview', requireCoordinator, excelUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse mapping from form data
    const mapping = JSON.parse(req.body.mapping || '{}');

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

    if (rawData.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    const headers = Object.keys(rawData[0]);
    const results = {
      staff: [],
      credentials: [],
      warnings: [],
      stats: {
        totalStaff: 0,
        totalCredentials: 0,
        totalCompetencies: 0,
        parseErrors: 0
      }
    };

    // Column mapping config
    const nameColumn = mapping.nameColumn || headers[0];
    const contactColumn = mapping.contactColumn || headers[1];
    const licenseNumColumn = mapping.licenseNumColumn;
    const credentialMappings = mapping.credentials || {}; // { columnIndex: credentialTypeId }
    const competencyMappings = mapping.competencies || {}; // { columnIndex: credentialTypeId }

    let currentRole = 'Unknown';

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNum = i + 2; // Excel row number

      // Check for role group header
      const detectedRole = detectRoleGroupHeader(row);
      if (detectedRole) {
        currentRole = detectedRole;
        continue;
      }

      // Skip empty rows
      if (isEmptyOrHeaderRow(row, headers)) continue;

      // Parse staff data
      const rawName = String(row[nameColumn] || '').trim();
      if (!rawName) continue;

      // Parse name - try to split into first/last
      const nameParts = rawName.split(/\s+/);
      let firstName, lastName;
      if (nameParts.length >= 2) {
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(' ');
      } else {
        firstName = rawName;
        lastName = '';
      }

      const staffWarnings = [];
      const staffEntry = {
        rowNumber: rowNum,
        firstName,
        lastName,
        fullName: rawName,
        contact: String(row[contactColumn] || '').trim(),
        role: currentRole === 'RCIS' ? 'Tech' : currentRole === 'Miscellaneous' ? 'Traveler' : currentRole,
        employmentType: currentRole === 'Miscellaneous' ? 'Traveler' : 'Permanent',
        licenseNumber: licenseNumColumn ? String(row[headers[licenseNumColumn]] || '').trim() : '',
        credentials: [],
        competencies: [],
        warnings: staffWarnings
      };

      // Parse credential columns (expiring)
      for (const [colIndex, credTypeId] of Object.entries(credentialMappings)) {
        const header = headers[parseInt(colIndex)];
        const rawValue = row[header];

        if (rawValue) {
          const colWarnings = [];
          const parsedDate = parseExcelDate(rawValue, colWarnings);

          if (parsedDate) {
            staffEntry.credentials.push({
              credentialTypeId: parseInt(credTypeId),
              columnName: header,
              expirationDate: parsedDate,
              isExpiring: true
            });
            results.stats.totalCredentials++;
          } else if (colWarnings.length > 0) {
            staffWarnings.push(...colWarnings.map(w => `${header}: ${w}`));
            results.stats.parseErrors++;
          }
        }
      }

      // Parse competency columns (one-time completion)
      for (const [colIndex, credTypeId] of Object.entries(competencyMappings)) {
        const header = headers[parseInt(colIndex)];
        const rawValue = row[header];

        if (rawValue) {
          const colWarnings = [];
          const parsedDate = parseExcelDate(rawValue, colWarnings);

          if (parsedDate) {
            staffEntry.competencies.push({
              credentialTypeId: parseInt(credTypeId),
              columnName: header,
              completionDate: parsedDate,
              isExpiring: false
            });
            results.stats.totalCompetencies++;
          } else if (colWarnings.length > 0) {
            staffWarnings.push(...colWarnings.map(w => `${header}: ${w}`));
            results.stats.parseErrors++;
          }
        }
      }

      if (staffWarnings.length > 0) {
        results.warnings.push({
          row: rowNum,
          name: rawName,
          warnings: staffWarnings
        });
      }

      results.staff.push(staffEntry);
      results.stats.totalStaff++;
    }

    res.json(results);

  } catch (err) {
    console.error('Excel preview error:', err);
    res.status(500).json({ error: 'Failed to preview import: ' + err.message });
  }
});

// ===== CREATE CREDENTIAL TYPE ENDPOINT =====
// Create a new credential type during import flow
router.post('/credential-type', requireCoordinator, async (req, res) => {
  try {
    const { name, category, isExpiring } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'Name and category are required' });
    }

    const renewalMonths = isExpiring ? 24 : null; // Default 2 year renewal for expiring creds
    const alertDays = isExpiring ? 90 : null;

    const { rows } = await pool.query(
      `INSERT INTO credential_types (name, category, renewal_period_months, alert_days, is_required, verification_required)
       VALUES ($1, $2, $3, $4, false, false) RETURNING *`,
      [name, category, renewalMonths, alertDays]
    );

    logAudit(req.session.userId, 'CREATE', 'credential_types', rows[0].id, null, req.body);
    res.status(201).json(rows[0]);

  } catch (err) {
    console.error('Create credential type error:', err);
    res.status(500).json({ error: 'Failed to create credential type: ' + err.message });
  }
});

// ===== CONFIRM IMPORT ENDPOINT =====
// Execute the import with parsed data
router.post('/confirm', requireCoordinator, async (req, res) => {
  try {
    const { staff } = req.body;

    if (!staff || !Array.isArray(staff) || staff.length === 0) {
      return res.status(400).json({ error: 'No staff data provided' });
    }

    const results = {
      staffCreated: 0,
      credentialsAssigned: 0,
      competenciesAssigned: 0,
      errors: []
    };

    for (const member of staff) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Check if staff already exists by name
        const existing = await client.query(
          `SELECT id FROM staff_members WHERE LOWER(first_name) = LOWER($1) AND LOWER(last_name) = LOWER($2)`,
          [member.firstName, member.lastName]
        );

        let staffId;
        if (existing.rows.length > 0) {
          staffId = existing.rows[0].id;
          // Update existing staff
          await client.query(
            `UPDATE staff_members SET
              phone = COALESCE(NULLIF($1, ''), phone),
              role = COALESCE(NULLIF($2, ''), role),
              employment_type = COALESCE(NULLIF($3, ''), employment_type),
              updated_at = NOW()
             WHERE id = $4`,
            [member.contact, member.role, member.employmentType, staffId]
          );
        } else {
          // Create new staff
          const insertResult = await client.query(
            `INSERT INTO staff_members (first_name, last_name, phone, role, employment_type, status)
             VALUES ($1, $2, $3, $4, $5, 'Active') RETURNING id`,
            [member.firstName, member.lastName, member.contact || null, member.role, member.employmentType]
          );
          staffId = insertResult.rows[0].id;
          results.staffCreated++;
        }

        // Insert credentials (expiring)
        for (const cred of (member.credentials || [])) {
          try {
            await client.query(
              `INSERT INTO staff_credentials
               (staff_id, credential_type_id, expiration_date, status, verified_by, verified_date)
               VALUES ($1, $2, $3, 'Active', $4, NOW())
               ON CONFLICT DO NOTHING`,
              [staffId, cred.credentialTypeId, cred.expirationDate, req.session.userId]
            );
            results.credentialsAssigned++;
          } catch (credErr) {
            results.errors.push({
              staff: member.fullName,
              type: 'credential',
              error: credErr.message
            });
          }
        }

        // Insert competencies (one-time)
        for (const comp of (member.competencies || [])) {
          try {
            await client.query(
              `INSERT INTO staff_credentials
               (staff_id, credential_type_id, issue_date, status, verified_by, verified_date)
               VALUES ($1, $2, $3, 'Active', $4, NOW())
               ON CONFLICT DO NOTHING`,
              [staffId, comp.credentialTypeId, comp.completionDate, req.session.userId]
            );
            results.competenciesAssigned++;
          } catch (compErr) {
            results.errors.push({
              staff: member.fullName,
              type: 'competency',
              error: compErr.message
            });
          }
        }

        await client.query('COMMIT');
        logAudit(req.session.userId, 'IMPORT', 'staff_members', staffId, null, {
          source: 'excel_import',
          name: member.fullName,
          credentials: member.credentials?.length || 0,
          competencies: member.competencies?.length || 0
        });

      } catch (err) {
        await client.query('ROLLBACK');
        results.errors.push({
          staff: member.fullName,
          row: member.rowNumber,
          error: err.message
        });
      } finally {
        client.release();
      }
    }

    res.json(results);

  } catch (err) {
    console.error('Import confirm error:', err);
    res.status(500).json({ error: 'Failed to import: ' + err.message });
  }
});

module.exports = router;
