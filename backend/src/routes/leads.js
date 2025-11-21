const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { db } = require('../config/database');

// Get all leads
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, search, limit = 50 } = req.query;
    const orgId = req.user.currentOrganizationId;

    // Filter by organization_id if available, OR show user's data without org_id (migration fallback)
    let query = orgId
      ? 'SELECT * FROM leads WHERE (organization_id = ? OR (organization_id IS NULL AND user_id = ?))'
      : 'SELECT * FROM leads WHERE user_id = ?';
    const params = orgId ? [orgId, req.user.id] : [req.user.id];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const leads = await db.all(query, params);

    res.json({
      success: true,
      data: leads
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leads'
    });
  }
});

// Get single lead with activities
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.currentOrganizationId;

    // Filter by organization_id if available, OR show user's data without org_id (migration fallback)
    const lead = orgId
      ? await db.get('SELECT * FROM leads WHERE id = ? AND (organization_id = ? OR (organization_id IS NULL AND user_id = ?))', [req.params.id, orgId, req.user.id])
      : await db.get('SELECT * FROM leads WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    // Get activities
    const activities = await db.all(`
      SELECT * FROM lead_activities WHERE lead_id = ? ORDER BY created_at DESC
    `, [lead.id]);

    res.json({
      success: true,
      data: {
        ...lead,
        activities
      }
    });
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead'
    });
  }
});

// Create lead
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, company, source, template_id, custom_fields } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const orgId = req.user.currentOrganizationId;

    await db.run(`
      INSERT INTO leads (
        id, user_id, organization_id, template_id, name, email, phone, company,
        source, custom_fields, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, req.user.id, orgId, template_id || null, name, email || null,
      phone || null, company || null, source || 'manual',
      custom_fields ? JSON.stringify(custom_fields) : null,
      now, now
    ]);

    // Log activity
    await db.run(`
      INSERT INTO lead_activities (id, lead_id, activity_type, description, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [uuidv4(), id, 'created', 'Lead created', now]);

    const lead = await db.get('SELECT * FROM leads WHERE id = ?', [id]);

    res.status(201).json({
      success: true,
      data: lead
    });
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create lead'
    });
  }
});

// Update lead
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { status, notes, tags, assigned_to, custom_fields, score } = req.body;

    const lead = await db.get(`
      SELECT id FROM leads WHERE id = ? AND user_id = ?
    `, [req.params.id, req.user.id]);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    const updates = [];
    const params = [];

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }
    if (tags !== undefined) {
      updates.push('tags = ?');
      params.push(tags);
    }
    if (assigned_to !== undefined) {
      updates.push('assigned_to = ?');
      params.push(assigned_to);
    }
    if (score !== undefined) {
      updates.push('score = ?');
      params.push(score);
    }
    if (custom_fields) {
      updates.push('custom_fields = ?');
      params.push(JSON.stringify(custom_fields));
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(req.params.id);

    await db.run(`
      UPDATE leads SET ${updates.join(', ')} WHERE id = ?
    `, [...params]);

    // Log activity if status changed
    if (status) {
      await db.run(`
        INSERT INTO lead_activities (id, lead_id, activity_type, description, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [uuidv4(), req.params.id, 'status_changed', `Status changed to ${status}`, new Date().toISOString()]);
    }

    const updated = await db.get('SELECT * FROM leads WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update lead'
    });
  }
});

// Delete lead
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.run(`
      DELETE FROM leads WHERE id = ? AND user_id = ?
    `, [req.params.id, req.user.id]);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete lead'
    });
  }
});

// Lead stats overview
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const stats = await db.get(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new,
        SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted,
        SUM(CASE WHEN status = 'qualified' THEN 1 ELSE 0 END) as qualified,
        SUM(CASE WHEN status = 'interested' THEN 1 ELSE 0 END) as interested,
        SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won,
        SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost
      FROM leads WHERE user_id = ?
    `, [req.user.id]);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Lead stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats'
    });
  }
});

// Add activity to lead
router.post('/:id/activities', authenticateToken, async (req, res) => {
  try {
    const { activity_type, description, metadata } = req.body;

    // Verify lead ownership
    const lead = await db.get(`
      SELECT id FROM leads WHERE id = ? AND user_id = ?
    `, [req.params.id, req.user.id]);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(`
      INSERT INTO lead_activities (id, lead_id, activity_type, description, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id,
      req.params.id,
      activity_type,
      description || null,
      metadata ? JSON.stringify(metadata) : null,
      now
    ]);

    const activity = await db.get('SELECT * FROM lead_activities WHERE id = ?', [id]);

    res.status(201).json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Add activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add activity'
    });
  }
});

module.exports = router;
