const { pool } = require('./database');

function logAudit(userId, action, tableName, recordId, oldValue, newValue) {
  pool.query(
    `INSERT INTO audit_log (user_id, action, table_name, record_id, old_value, new_value)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, action, tableName, recordId, JSON.stringify(oldValue), JSON.stringify(newValue)]
  ).catch(err => console.error('Audit log error:', err));
}

module.exports = { logAudit };
