const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../database');

const router = express.Router();

// Check if initial setup is needed
router.get('/status', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) as count FROM users');
    res.json({ needsSetup: parseInt(rows[0].count) === 0 });
  } catch (err) {
    console.error('Setup status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create initial coordinator account (only works if zero users exist)
router.post('/init', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) as count FROM users');
    if (parseInt(rows[0].count) > 0) {
      return res.status(403).json({ error: 'Setup already completed' });
    }

    const { username, password, displayName, title, email } = req.body;

    if (!username || !password || !displayName || !title) {
      return res.status(400).json({ error: 'Username, password, display name, and title are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (username, password_hash, display_name, title, role, email)
       VALUES ($1, $2, $3, $4, 'coordinator', $5)`,
      [username, passwordHash, displayName, title, email || null]
    );

    res.status(201).json({ message: 'Initial coordinator account created' });
  } catch (err) {
    console.error('Setup init error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
