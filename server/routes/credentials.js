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
    // Only allow specific fields to be updated
    const allowedFields = [
      'name', 'category', 'issuing_body', 'renewal_period_months', 'ceu_requirement',
      'required_for', 'is_required', 'alert_days', 'verification_required', 'allow_multiple',
      'instructions', 'description'
    ];

    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const keys = Object.keys(updates);
    if (keys.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

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

typesRouter.delete('/:id', requireCoordinator, async (req, res) => {
  try {
    const old = await pool.query('SELECT * FROM credential_types WHERE id = $1', [req.params.id]);
    if (old.rows.length === 0) {
      return res.status(404).json({ error: 'Credential type not found' });
    }

    // Delete associated staff credentials first
    await pool.query('DELETE FROM staff_credentials WHERE credential_type_id = $1', [req.params.id]);

    // Delete the credential type
    await pool.query('DELETE FROM credential_types WHERE id = $1', [req.params.id]);

    logAudit(req.session.userId, 'DELETE', 'credential_types', req.params.id, old.rows[0], null);
    res.json({ message: 'Credential type deleted successfully' });
  } catch (err) {
    console.error('Delete credential type error:', err);
    res.status(500).json({ error: 'Failed to delete credential type' });
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
// Staff can edit their own credentials, managers/coordinators can edit anyone's
credentialsRouter.put('/:id', requireAuth, async (req, res) => {
  try {
    // Check ownership for staff role
    const credential = await pool.query('SELECT * FROM staff_credentials WHERE id = $1', [req.params.id]);
    if (credential.rows.length === 0) {
      return res.status(404).json({ error: 'Credential not found' });
    }

    const isOwner = req.session.staffMemberId === credential.rows[0].staff_id;
    const isManagerOrAbove = req.session.userRole === 'manager' || req.session.userRole === 'coordinator';

    if (!isOwner && !isManagerOrAbove) {
      return res.status(403).json({ error: 'You can only edit your own credentials' });
    }

    // Only allow specific fields to be updated
    const allowedFields = [
      'issue_date', 'expiration_date', 'status', 'notes',
      'verified_by', 'verified_date', 'superseded'
    ];

    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Convert empty date strings to null for PostgreSQL
    ['issue_date', 'expiration_date', 'verified_date'].forEach(field => {
      if (updates[field] === '') updates[field] = null;
    });

    const keys = Object.keys(updates);
    if (keys.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = [...Object.values(updates), req.params.id];

    await pool.query(
      `UPDATE staff_credentials SET ${setClause}, updated_at = NOW() WHERE id = $${keys.length + 1}`,
      values
    );

    logAudit(req.session.userId, 'UPDATE', 'staff_credentials', req.params.id, credential.rows[0], updates);
    res.json({ message: 'Credential updated successfully' });
  } catch (err) {
    console.error('Update credential error:', err);
    res.status(500).json({ error: 'Failed to update credential' });
  }
});

// Delete credential: DELETE /api/staff-credentials/:id
credentialsRouter.delete('/:id', requireManager, async (req, res) => {
  try {
    const old = await pool.query('SELECT * FROM staff_credentials WHERE id = $1', [req.params.id]);
    if (old.rows.length === 0) {
      return res.status(404).json({ error: 'Credential not found' });
    }

    // Delete associated documents first
    await pool.query('DELETE FROM documents WHERE staff_credential_id = $1', [req.params.id]);

    // Delete the credential
    await pool.query('DELETE FROM staff_credentials WHERE id = $1', [req.params.id]);

    logAudit(req.session.userId, 'DELETE', 'staff_credentials', req.params.id, old.rows[0], null);
    res.json({ message: 'Credential deleted successfully' });
  } catch (err) {
    console.error('Delete credential error:', err);
    res.status(500).json({ error: 'Failed to delete credential' });
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
