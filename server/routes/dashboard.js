const express = require('express');
const { pool } = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const activeStaff = await pool.query(
      "SELECT COUNT(*) as count FROM staff_members WHERE status = 'Active'"
    );
    const expired = await pool.query(
      "SELECT COUNT(*) as count FROM staff_credentials WHERE status = 'Expired'"
    );
    const expiringSoon30 = await pool.query(
      `SELECT COUNT(*) as count FROM staff_credentials
       WHERE status = 'Expiring Soon'
       AND expiration_date <= CURRENT_DATE + INTERVAL '30 days'`
    );
    const expiringSoon90 = await pool.query(
      `SELECT COUNT(*) as count FROM staff_credentials
       WHERE status IN ('Active', 'Expiring Soon')
       AND expiration_date <= CURRENT_DATE + INTERVAL '90 days'`
    );

    res.json({
      activeStaff: parseInt(activeStaff.rows[0].count),
      expired: parseInt(expired.rows[0].count),
      expiringSoon30: parseInt(expiringSoon30.rows[0].count),
      expiringSoon90: parseInt(expiringSoon90.rows[0].count),
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get upcoming expirations
router.get('/upcoming-expirations', requireAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;

    const { rows } = await pool.query(
      `SELECT sc.*, sm.first_name, sm.last_name, sm.employee_id,
              ct.name as credential_name, ct.category,
              (sc.expiration_date - CURRENT_DATE) as days_until_expiration
       FROM staff_credentials sc
       JOIN staff_members sm ON sc.staff_id = sm.id
       JOIN credential_types ct ON sc.credential_type_id = ct.id
       WHERE sm.status = 'Active'
         AND sc.expiration_date IS NOT NULL
         AND sc.expiration_date <= CURRENT_DATE + INTERVAL '1 day' * $1
         AND sc.superseded = false
       ORDER BY sc.expiration_date ASC`,
      [days]
    );
    res.json(rows);
  } catch (err) {
    console.error('Upcoming expirations error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
