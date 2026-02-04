const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'staff', req.body.staff_id || 'temp');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only PDF, JPG, and PNG files are allowed'));
  }
});

// Upload document (coordinators, managers, and staff for their own credentials)
router.post('/upload', requireAuth, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { staff_credential_id } = req.body;

    // Staff users can only upload for their own credentials
    if (req.session.userRole === 'staff') {
      const { rows } = await pool.query(
        `SELECT sc.staff_id FROM staff_credentials sc WHERE sc.id = $1`,
        [staff_credential_id]
      );
      if (rows.length === 0 || rows[0].staff_id !== req.session.staffMemberId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO documents
       (staff_credential_id, file_name, file_path, file_size, file_type, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [staff_credential_id, req.file.originalname, req.file.path, req.file.size, req.file.mimetype, req.session.userId]
    );

    res.status(201).json({
      id: rows[0].id,
      fileName: req.file.originalname,
      filePath: req.file.path,
    });
  } catch (err) {
    console.error('Upload document error:', err);
    res.status(500).json({ error: 'Failed to save document record' });
  }
});

// Get documents for a credential
router.get('/credential/:id', requireAuth, async (req, res) => {
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

module.exports = router;
