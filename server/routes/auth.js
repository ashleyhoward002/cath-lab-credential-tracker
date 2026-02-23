const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { pool } = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later' },
});

// Login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    const { rows } = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND is_active = true',
      [username]
    );
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.userRole = user.role?.toLowerCase() || 'staff';
    req.session.displayName = user.display_name;
    req.session.staffMemberId = user.staff_member_id;

    res.json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      title: user.title,
      role: user.role,
      staffMemberId: user.staff_member_id,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Check session
router.get('/session', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, username, display_name, title, role, staff_member_id FROM users WHERE id = $1 AND is_active = true',
      [req.session.userId]
    );
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Session invalid' });
    }

    res.json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      title: user.title,
      role: user.role,
      staffMemberId: user.staff_member_id,
    });
  } catch (err) {
    console.error('Session check error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Change password
router.put('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.session.userId]);
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, req.session.userId]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
