const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../database');
const { requireCoordinator } = require('../middleware/auth');
const { logAudit } = require('../helpers');

const router = express.Router();

// Get all users
router.get('/', requireCoordinator, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.title, u.role, u.email,
              u.is_active, u.staff_member_id, u.created_at,
              sm.first_name as staff_first_name, sm.last_name as staff_last_name
       FROM users u
       LEFT JOIN staff_members sm ON u.staff_member_id = sm.id
       ORDER BY u.display_name`
    );
    res.json(rows);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get single user
router.get('/:id', requireCoordinator, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.title, u.role, u.email,
              u.is_active, u.staff_member_id, u.created_at
       FROM users u WHERE u.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create user
router.post('/', requireCoordinator, async (req, res) => {
  try {
    const { username, password, display_name, title, role, email, staff_member_id } = req.body;

    if (!username || !password || !display_name || !title || !role) {
      return res.status(400).json({ error: 'Username, password, display name, title, and role are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (!['coordinator', 'manager', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (role === 'staff' && !staff_member_id) {
      return res.status(400).json({ error: 'Staff role requires a linked staff member' });
    }

    // Check that staff_member_id isn't already linked to another user
    if (staff_member_id) {
      const existing = await pool.query(
        'SELECT id FROM users WHERE staff_member_id = $1',
        [staff_member_id]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'That staff member is already linked to a user account' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      `INSERT INTO users (username, password_hash, display_name, title, role, email, staff_member_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [username, passwordHash, display_name, title, role, email || null, staff_member_id || null]
    );

    logAudit(req.session.userId, 'CREATE', 'users', rows[0].id, null, { username, display_name, role });
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error('Create user error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/:id', requireCoordinator, async (req, res) => {
  try {
    const { display_name, title, role, email, is_active, staff_member_id } = req.body;

    const old = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (old.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check staff_member_id uniqueness if changing it
    if (staff_member_id && staff_member_id !== old.rows[0].staff_member_id) {
      const existing = await pool.query(
        'SELECT id FROM users WHERE staff_member_id = $1 AND id != $2',
        [staff_member_id, req.params.id]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'That staff member is already linked to a user account' });
      }
    }

    await pool.query(
      `UPDATE users SET display_name = COALESCE($1, display_name), title = COALESCE($2, title),
       role = COALESCE($3, role), email = $4, is_active = COALESCE($5, is_active),
       staff_member_id = $6, updated_at = NOW() WHERE id = $7`,
      [display_name, title, role, email, is_active, staff_member_id || null, req.params.id]
    );

    logAudit(req.session.userId, 'UPDATE', 'users', req.params.id, old.rows[0], req.body);
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Deactivate user
router.delete('/:id', requireCoordinator, async (req, res) => {
  try {
    // Prevent deactivating yourself
    if (parseInt(req.params.id) === req.session.userId) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    await pool.query(
      'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1',
      [req.params.id]
    );

    logAudit(req.session.userId, 'DEACTIVATE', 'users', req.params.id, null, null);
    res.json({ message: 'User deactivated successfully' });
  } catch (err) {
    console.error('Deactivate user error:', err);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// Reset password
router.post('/:id/reset-password', requireCoordinator, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, req.params.id]
    );

    logAudit(req.session.userId, 'RESET_PASSWORD', 'users', req.params.id, null, null);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
