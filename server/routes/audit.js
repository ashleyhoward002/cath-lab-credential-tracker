const express = require('express');
const { pool } = require('../database');
const { requireCoordinator } = require('../middleware/auth');

const router = express.Router();

// Get audit log entries
router.get('/', requireCoordinator, async (req, res) => {
  try {
    const { limit = 100, offset = 0, table_name, user_id, action } = req.query;

    let query = `
      SELECT
        al.*,
        u.display_name as user_name,
        u.username,
        sm.first_name as staff_first_name,
        sm.last_name as staff_last_name
      FROM audit_log al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN staff_credentials sc ON al.table_name = 'staff_credentials' AND al.record_id = sc.id
      LEFT JOIN staff_members sm ON sc.staff_id = sm.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (table_name) {
      paramCount++;
      query += ` AND al.table_name = $${paramCount}`;
      params.push(table_name);
    }

    if (user_id) {
      paramCount++;
      query += ` AND al.user_id = $${paramCount}`;
      params.push(user_id);
    }

    if (action) {
      paramCount++;
      query += ` AND al.action = $${paramCount}`;
      params.push(action);
    }

    query += ` ORDER BY al.timestamp DESC`;

    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const { rows } = await pool.query(query, params);

    // Parse JSON values and format for display
    const formattedRows = rows.map(row => {
      let oldValue = null;
      let newValue = null;
      let changes = [];

      try {
        oldValue = row.old_value ? JSON.parse(row.old_value) : null;
        newValue = row.new_value ? JSON.parse(row.new_value) : null;

        // Calculate what changed
        if (oldValue && newValue) {
          for (const key of Object.keys(newValue)) {
            if (oldValue[key] !== newValue[key]) {
              changes.push({
                field: key,
                from: oldValue[key],
                to: newValue[key]
              });
            }
          }
        } else if (newValue) {
          changes = Object.entries(newValue).map(([key, value]) => ({
            field: key,
            from: null,
            to: value
          }));
        }
      } catch (e) {
        // JSON parse error, keep as strings
      }

      return {
        ...row,
        old_value: oldValue,
        new_value: newValue,
        changes
      };
    });

    res.json(formattedRows);
  } catch (err) {
    console.error('Get audit log error:', err);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// Get audit log stats
router.get('/stats', requireCoordinator, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) as total_entries,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '24 hours') as last_24h,
        COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '7 days') as last_7d
      FROM audit_log
    `);

    const { rows: byAction } = await pool.query(`
      SELECT action, COUNT(*) as count
      FROM audit_log
      WHERE timestamp > NOW() - INTERVAL '30 days'
      GROUP BY action
      ORDER BY count DESC
    `);

    const { rows: recentUsers } = await pool.query(`
      SELECT u.id, u.display_name, u.username, COUNT(*) as edit_count, MAX(al.timestamp) as last_edit
      FROM audit_log al
      JOIN users u ON al.user_id = u.id
      WHERE al.timestamp > NOW() - INTERVAL '30 days'
      GROUP BY u.id, u.display_name, u.username
      ORDER BY edit_count DESC
      LIMIT 10
    `);

    res.json({
      ...rows[0],
      by_action: byAction,
      recent_users: recentUsers
    });
  } catch (err) {
    console.error('Get audit stats error:', err);
    res.status(500).json({ error: 'Failed to fetch audit stats' });
  }
});

module.exports = router;
