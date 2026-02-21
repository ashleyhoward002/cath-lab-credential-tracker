const express = require('express');
const { pool } = require('../database');
const { requireAuth, requireCoordinator, requireManager } = require('../middleware/auth');
const { logAudit } = require('../helpers');

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

    const { rows } = await pool.query(
      `INSERT INTO staff_members
       (employee_id, first_name, last_name, email, phone, role, employment_type,
        hire_date, contract_start_date, contract_end_date, agency_name,
        agency_contact, home_state, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id`,
      [employee_id, first_name, last_name, email, phone, role, employment_type,
       hire_date, contract_start_date, contract_end_date, agency_name,
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
    const updates = req.body;
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

module.exports = router;
