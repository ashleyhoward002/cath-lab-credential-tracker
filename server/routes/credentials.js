const express = require('express');
const { pool } = require('../database');
const { requireAuth, requireCoordinator, requireManager } = require('../middleware/auth');
const { logAudit } = require('../helpers');

// ===== CREDENTIAL TYPES ROUTER (mounted at /api/credential-types) =====
const typesRouter = express.Router();

typesRouter.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM credential_types ORDER BY category, name');
    res.json(rows);
  } catch (err) {
    console.error('Get credential types error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

typesRouter.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM credential_types WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Credential type not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Get credential type error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

typesRouter.post('/', requireCoordinator, async (req, res) => {
  try {
    const {
      name, category, issuing_body, renewal_period_months, ceu_requirement,
      required_for, is_required, alert_days, verification_required, allow_multiple, instructions
    } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO credential_types
       (name, category, issuing_body, renewal_period_months, ceu_requirement,
        required_for, is_required, alert_days, verification_required, allow_multiple, instructions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [name, category, issuing_body, renewal_period_months, ceu_requirement,
       required_for, is_required, alert_days, verification_required, allow_multiple, instructions]
    );

    logAudit(req.session.userId, 'CREATE', 'credential_types', rows[0].id, null, req.body);
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error('Create credential type error:', err);
    res.status(500).json({ error: 'Failed to create credential type' });
  }
});

typesRouter.put('/:id', requireCoordinator, async (req, res) => {
  try {
    const updates = req.body;
    const keys = Object.keys(updates);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = [...Object.values(updates), req.params.id];

    const old = await pool.query('SELECT * FROM credential_types WHERE id = $1', [req.params.id]);

    await pool.query(
      `UPDATE credential_types SET ${setClause}, updated_at = NOW() WHERE id = $${keys.length + 1}`,
      values
    );

    logAudit(req.session.userId, 'UPDATE', 'credential_types', req.params.id, old.rows[0], updates);
    res.json({ message: 'Credential type updated successfully' });
  } catch (err) {
    console.error('Update credential type error:', err);
    res.status(500).json({ error: 'Failed to update credential type' });
  }
});

// ===== STAFF CREDENTIALS ROUTER (mounted at /api/staff-credentials) =====
const credentialsRouter = express.Router();

// Get credentials for a staff member: GET /api/staff-credentials/staff/:staffId
credentialsRouter.get('/staff/:staffId', requireAuth, async (req, res) => {
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

// Assign credential: POST /api/staff-credentials/staff/:staffId
credentialsRouter.post('/staff/:staffId', requireManager, async (req, res) => {
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

// Update credential: PUT /api/staff-credentials/:id
credentialsRouter.put('/:id', requireManager, async (req, res) => {
  try {
    const updates = req.body;
    const keys = Object.keys(updates);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = [...Object.values(updates), req.params.id];

    const old = await pool.query('SELECT * FROM staff_credentials WHERE id = $1', [req.params.id]);

    await pool.query(
      `UPDATE staff_credentials SET ${setClause}, updated_at = NOW() WHERE id = $${keys.length + 1}`,
      values
    );

    logAudit(req.session.userId, 'UPDATE', 'staff_credentials', req.params.id, old.rows[0], updates);
    res.json({ message: 'Credential updated successfully' });
  } catch (err) {
    console.error('Update credential error:', err);
    res.status(500).json({ error: 'Failed to update credential' });
  }
});

// Get documents for a credential: GET /api/staff-credentials/:id/documents
credentialsRouter.get('/:id/documents', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.*, u.username as uploaded_by_name
       FROM documents d
       LEFT JOIN users u ON d.uploaded_by = u.id
       WHERE d.staff_credential_id = $1
       ORDER BY d.uploaded_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get documents error:', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

module.exports = { typesRouter, credentialsRouter };
