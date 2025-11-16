const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const db = require('../database/db');

// Get all snapshots for user
router.get('/', authenticateToken, (req, res) => {
  try {
    const snapshots = db.prepare(`
      SELECT id, name, description, tags, created_at, updated_at
      FROM snapshots
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(req.user.id);

    res.json(snapshots);
  } catch (error) {
    console.error('Get snapshots error:', error);
    res.status(500).json({ error: 'Failed to fetch snapshots' });
  }
});

// Get single snapshot with full data
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const snapshot = db.prepare(`
      SELECT * FROM snapshots
      WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    // Parse template_data JSON
    snapshot.template_data = JSON.parse(snapshot.template_data);

    res.json(snapshot);
  } catch (error) {
    console.error('Get snapshot error:', error);
    res.status(500).json({ error: 'Failed to fetch snapshot' });
  }
});

// Create new snapshot
router.post('/', authenticateToken, (req, res) => {
  try {
    const { name, description, template_data, tags } = req.body;

    if (!name || !template_data) {
      return res.status(400).json({ error: 'Name and template data are required' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO snapshots (id, user_id, name, description, template_data, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      req.user.id,
      name,
      description || null,
      JSON.stringify(template_data),
      tags || null,
      now,
      now
    );

    const snapshot = db.prepare('SELECT * FROM snapshots WHERE id = ?').get(id);
    snapshot.template_data = JSON.parse(snapshot.template_data);

    res.status(201).json(snapshot);
  } catch (error) {
    console.error('Create snapshot error:', error);
    res.status(500).json({ error: 'Failed to create snapshot' });
  }
});

// Deploy snapshot (create new template from snapshot)
router.post('/:id/deploy', authenticateToken, (req, res) => {
  try {
    const { customName } = req.body;

    const snapshot = db.prepare(`
      SELECT * FROM snapshots
      WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    const templateData = JSON.parse(snapshot.template_data);
    const templateId = uuidv4();
    const now = new Date().toISOString();

    // Create new template from snapshot
    db.prepare(`
      INSERT INTO templates (
        id, user_id, name, description, tag,
        conversationSteps, intentRecognition, bookingWorkflow,
        responseStyle, availabilitySettings,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      templateId,
      req.user.id,
      customName || `${templateData.name} (Copy)`,
      templateData.description,
      templateData.tag,
      JSON.stringify(templateData.conversationSteps || []),
      JSON.stringify(templateData.intentRecognition || {}),
      JSON.stringify(templateData.bookingWorkflow || {}),
      JSON.stringify(templateData.responseStyle || {}),
      JSON.stringify(templateData.availabilitySettings || {}),
      now,
      now
    );

    const newTemplate = db.prepare('SELECT * FROM templates WHERE id = ?').get(templateId);

    res.json({
      message: 'Snapshot deployed successfully',
      template: newTemplate
    });
  } catch (error) {
    console.error('Deploy snapshot error:', error);
    res.status(500).json({ error: 'Failed to deploy snapshot' });
  }
});

// Update snapshot
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { name, description, tags } = req.body;

    const snapshot = db.prepare(`
      SELECT id FROM snapshots
      WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    db.prepare(`
      UPDATE snapshots
      SET name = ?, description = ?, tags = ?, updated_at = ?
      WHERE id = ?
    `).run(
      name,
      description || null,
      tags || null,
      new Date().toISOString(),
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM snapshots WHERE id = ?').get(req.params.id);
    updated.template_data = JSON.parse(updated.template_data);

    res.json(updated);
  } catch (error) {
    console.error('Update snapshot error:', error);
    res.status(500).json({ error: 'Failed to update snapshot' });
  }
});

// Delete snapshot
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const result = db.prepare(`
      DELETE FROM snapshots
      WHERE id = ? AND user_id = ?
    `).run(req.params.id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    res.json({ message: 'Snapshot deleted successfully' });
  } catch (error) {
    console.error('Delete snapshot error:', error);
    res.status(500).json({ error: 'Failed to delete snapshot' });
  }
});

module.exports = router;
