const express = require('express');
const router = express.Router();
const { db, generateUUID } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// ==========================================
// GET /api/organizations
// Get all organizations for current user
// ==========================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const organizations = await db.all(`
      SELECT
        o.*,
        om.role,
        om.status as member_status,
        om.joined_at
      FROM organizations o
      INNER JOIN organization_members om ON o.id = om.organization_id
      WHERE om.user_id = ? AND om.status = 'active'
      ORDER BY om.joined_at DESC
    `, [userId]);

    res.json(organizations);
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ error: 'Failed to get organizations' });
  }
});

// ==========================================
// GET /api/organizations/:id
// Get organization details
// ==========================================
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user is a member
    const membership = await db.get(`
      SELECT role FROM organization_members
      WHERE organization_id = ? AND user_id = ? AND status = 'active'
    `, [id, userId]);

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const organization = await db.get('SELECT * FROM organizations WHERE id = ?', [id]);

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Get member count
    const memberCount = await db.get(`
      SELECT COUNT(*) as count FROM organization_members
      WHERE organization_id = ? AND status = 'active'
    `, [id]);

    res.json({
      ...organization,
      memberCount: memberCount.count,
      userRole: membership.role
    });
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ error: 'Failed to get organization' });
  }
});

// ==========================================
// POST /api/organizations
// Create new organization
// ==========================================
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Organization name is required' });
    }

    const organizationId = generateUUID();
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + organizationId.substring(0, 8);

    // Create organization
    await db.run(`
      INSERT INTO organizations (id, name, slug, owner_id, plan_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'free', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [organizationId, name, slug, userId]);

    // Add user as owner
    const memberId = generateUUID();
    await db.run(`
      INSERT INTO organization_members (id, organization_id, user_id, role, status, joined_at)
      VALUES (?, ?, ?, 'owner', 'active', CURRENT_TIMESTAMP)
    `, [memberId, organizationId, userId]);

    const organization = await db.get('SELECT * FROM organizations WHERE id = ?', [organizationId]);

    res.json({
      success: true,
      organization: {
        ...organization,
        userRole: 'owner'
      }
    });
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// ==========================================
// PUT /api/organizations/:id
// Update organization
// ==========================================
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, logo_url } = req.body;
    const userId = req.user.id;

    // Check if user is owner or admin
    const membership = await db.get(`
      SELECT role FROM organization_members
      WHERE organization_id = ? AND user_id = ? AND status = 'active'
    `, [id, userId]);

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.run(`
      UPDATE organizations
      SET name = ?, logo_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, logo_url, id]);

    const organization = await db.get('SELECT * FROM organizations WHERE id = ?', [id]);

    res.json({ success: true, organization });
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// ==========================================
// GET /api/organizations/:id/members
// Get organization members
// ==========================================
router.get('/:id/members', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user is a member
    const membership = await db.get(`
      SELECT role FROM organization_members
      WHERE organization_id = ? AND user_id = ? AND status = 'active'
    `, [id, userId]);

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const members = await db.all(`
      SELECT
        om.*,
        u.email,
        u.first_name,
        u.last_name,
        u.profile_image
      FROM organization_members om
      INNER JOIN users u ON om.user_id = u.id
      WHERE om.organization_id = ? AND om.status = 'active'
      ORDER BY
        CASE om.role
          WHEN 'owner' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'member' THEN 3
        END,
        om.joined_at DESC
    `, [id]);

    res.json(members);
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Failed to get members' });
  }
});

// ==========================================
// POST /api/organizations/:id/invite
// Invite user to organization
// ==========================================
router.post('/:id/invite', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role = 'member' } = req.body;
    const userId = req.user.id;

    // Check if user is owner or admin
    const membership = await db.get(`
      SELECT role FROM organization_members
      WHERE organization_id = ? AND user_id = ? AND status = 'active'
    `, [id, userId]);

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if user is already a member
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      const existingMember = await db.get(`
        SELECT id FROM organization_members
        WHERE organization_id = ? AND user_id = ?
      `, [id, existingUser.id]);

      if (existingMember) {
        return res.status(400).json({ error: 'User is already a member' });
      }
    }

    // Create invitation
    const invitationId = generateUUID();
    const token = generateUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.run(`
      INSERT INTO organization_invitations (id, organization_id, email, role, invited_by, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [invitationId, id, email, role, userId, token, expiresAt.toISOString()]);

    // TODO: Send invitation email

    res.json({
      success: true,
      message: 'Invitation sent',
      invitation: {
        id: invitationId,
        email,
        role,
        token
      }
    });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// ==========================================
// DELETE /api/organizations/:id/members/:memberId
// Remove member from organization
// ==========================================
router.delete('/:id/members/:memberId', authenticateToken, async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.user.id;

    // Check if user is owner or admin
    const membership = await db.get(`
      SELECT role FROM organization_members
      WHERE organization_id = ? AND user_id = ? AND status = 'active'
    `, [id, userId]);

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Can't remove owner
    const targetMember = await db.get(`
      SELECT role FROM organization_members WHERE id = ?
    `, [memberId]);

    if (targetMember && targetMember.role === 'owner') {
      return res.status(400).json({ error: 'Cannot remove organization owner' });
    }

    await db.run(`
      UPDATE organization_members
      SET status = 'removed'
      WHERE id = ?
    `, [memberId]);

    res.json({ success: true, message: 'Member removed' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

module.exports = router;
