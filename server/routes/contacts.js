const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../database');
const { requireAuth } = require('../middleware/auth');
const { logAudit } = require('../helpers');

const router = express.Router();

// Multer configuration for business card images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'contacts');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'card-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpg|jpeg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /image/.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// ===== CATEGORIES =====

// Get all categories
router.get('/categories', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM contact_categories ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create category
router.post('/categories', requireAuth, async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const { rows } = await pool.query(
      `INSERT INTO contact_categories (name, color, created_by)
       VALUES ($1, $2, $3) RETURNING id`,
      [name.trim(), color || '#3b82f6', req.session.userId]
    );

    logAudit(req.session.userId, 'CREATE', 'contact_categories', rows[0].id, null, { name, color });
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error('Create category error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
router.put('/categories/:id', requireAuth, async (req, res) => {
  try {
    const { name, color } = req.body;

    const old = await pool.query('SELECT * FROM contact_categories WHERE id = $1', [req.params.id]);
    if (old.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await pool.query(
      `UPDATE contact_categories SET name = $1, color = $2 WHERE id = $3`,
      [name, color, req.params.id]
    );

    logAudit(req.session.userId, 'UPDATE', 'contact_categories', req.params.id, old.rows[0], { name, color });
    res.json({ message: 'Category updated successfully' });
  } catch (err) {
    console.error('Update category error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/categories/:id', requireAuth, async (req, res) => {
  try {
    const old = await pool.query('SELECT * FROM contact_categories WHERE id = $1', [req.params.id]);
    if (old.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await pool.query('DELETE FROM contact_categories WHERE id = $1', [req.params.id]);

    logAudit(req.session.userId, 'DELETE', 'contact_categories', req.params.id, old.rows[0], null);
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// ===== CONTACTS =====

// Get all contacts with optional filters
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search, category, favorites } = req.query;

    let query = `
      SELECT c.*, cc.name as category_name, cc.color as category_color
      FROM contacts c
      LEFT JOIN contact_categories cc ON c.category_id = cc.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (
        c.name ILIKE $${paramIndex} OR
        c.company ILIKE $${paramIndex} OR
        c.email ILIKE $${paramIndex} OR
        c.title ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      query += ` AND c.category_id = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (favorites === 'true') {
      query += ` AND c.is_favorite = true`;
    }

    query += ` ORDER BY c.is_favorite DESC, c.name ASC`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Get contacts error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get single contact
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, cc.name as category_name, cc.color as category_color
       FROM contacts c
       LEFT JOIN contact_categories cc ON c.category_id = cc.id
       WHERE c.id = $1`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Get tags
    const tagsResult = await pool.query(
      'SELECT tag FROM contact_tags WHERE contact_id = $1',
      [req.params.id]
    );
    rows[0].tags = tagsResult.rows.map(r => r.tag);

    res.json(rows[0]);
  } catch (err) {
    console.error('Get contact error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create contact
router.post('/', requireAuth, async (req, res) => {
  try {
    const allowedFields = [
      'name', 'title', 'company', 'email', 'phone', 'phone_secondary',
      'category_id', 'notes', 'card_image_path', 'is_favorite'
    ];

    const data = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        data[field] = req.body[field];
      }
    });

    if (!data.name || !data.name.trim()) {
      return res.status(400).json({ error: 'Contact name is required' });
    }

    // Handle empty category_id
    if (data.category_id === '' || data.category_id === null) {
      data.category_id = null;
    }

    const { rows } = await pool.query(
      `INSERT INTO contacts (name, title, company, email, phone, phone_secondary,
                             category_id, notes, card_image_path, is_favorite, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [
        data.name, data.title || null, data.company || null,
        data.email || null, data.phone || null, data.phone_secondary || null,
        data.category_id || null, data.notes || null, data.card_image_path || null,
        data.is_favorite || false, req.session.userId
      ]
    );

    // Handle tags if provided
    const tags = req.body.tags;
    if (tags && Array.isArray(tags) && tags.length > 0) {
      for (const tag of tags) {
        await pool.query(
          'INSERT INTO contact_tags (contact_id, tag) VALUES ($1, $2)',
          [rows[0].id, tag]
        );
      }
    }

    logAudit(req.session.userId, 'CREATE', 'contacts', rows[0].id, null, data);
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error('Create contact error:', err);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// Update contact
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const allowedFields = [
      'name', 'title', 'company', 'email', 'phone', 'phone_secondary',
      'category_id', 'notes', 'card_image_path', 'is_favorite'
    ];

    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Handle empty category_id
    if (updates.category_id === '' || updates.category_id === null) {
      updates.category_id = null;
    }

    const keys = Object.keys(updates);
    if (keys.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const old = await pool.query('SELECT * FROM contacts WHERE id = $1', [req.params.id]);
    if (old.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = [...Object.values(updates), req.params.id];

    await pool.query(
      `UPDATE contacts SET ${setClause}, updated_at = NOW() WHERE id = $${keys.length + 1}`,
      values
    );

    // Handle tags if provided
    const tags = req.body.tags;
    if (tags !== undefined) {
      await pool.query('DELETE FROM contact_tags WHERE contact_id = $1', [req.params.id]);
      if (Array.isArray(tags) && tags.length > 0) {
        for (const tag of tags) {
          await pool.query(
            'INSERT INTO contact_tags (contact_id, tag) VALUES ($1, $2)',
            [req.params.id, tag]
          );
        }
      }
    }

    logAudit(req.session.userId, 'UPDATE', 'contacts', req.params.id, old.rows[0], updates);
    res.json({ message: 'Contact updated successfully' });
  } catch (err) {
    console.error('Update contact error:', err);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// Delete contact
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const old = await pool.query('SELECT * FROM contacts WHERE id = $1', [req.params.id]);
    if (old.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Delete card image file if exists
    if (old.rows[0].card_image_path) {
      const imagePath = path.join(__dirname, '..', '..', old.rows[0].card_image_path);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await pool.query('DELETE FROM contacts WHERE id = $1', [req.params.id]);

    logAudit(req.session.userId, 'DELETE', 'contacts', req.params.id, old.rows[0], null);
    res.json({ message: 'Contact deleted successfully' });
  } catch (err) {
    console.error('Delete contact error:', err);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// Toggle favorite
router.put('/:id/favorite', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE contacts SET is_favorite = NOT is_favorite, updated_at = NOW() WHERE id = $1 RETURNING is_favorite',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ is_favorite: rows[0].is_favorite });
  } catch (err) {
    console.error('Toggle favorite error:', err);
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
});

// Upload business card image
router.post('/upload-card', requireAuth, upload.single('card'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const relativePath = `uploads/contacts/${req.file.filename}`;
    res.json({
      path: relativePath,
      filename: req.file.filename
    });
  } catch (err) {
    console.error('Upload card error:', err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Serve card images
router.get('/image/:filename', requireAuth, (req, res) => {
  const imagePath = path.join(__dirname, '..', '..', 'uploads', 'contacts', req.params.filename);
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.status(404).json({ error: 'Image not found' });
  }
});

module.exports = router;
