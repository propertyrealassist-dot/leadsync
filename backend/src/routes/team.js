const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

/**
 * Team Management Routes
 * Unique feature for LeadSync - multi-user collaboration
 */

// Get all team members
router.get('/members', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // In production, fetch from database
    // const members = await db.query('SELECT * FROM team_members WHERE organization_id = ?', [userId]);

    // Demo response
    const members = [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@leadsync.com',
        role: 'admin',
        status: 'active',
        joinedAt: new Date('2024-01-15').toISOString(),
        lastActive: new Date('2024-03-20').toISOString()
      },
      {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@leadsync.com',
        role: 'manager',
        status: 'active',
        joinedAt: new Date('2024-02-01').toISOString(),
        lastActive: new Date('2024-03-19').toISOString()
      },
      {
        id: 3,
        name: 'Bob Johnson',
        email: 'bob@leadsync.com',
        role: 'member',
        status: 'active',
        joinedAt: new Date('2024-02-15').toISOString(),
        lastActive: new Date('2024-03-18').toISOString()
      }
    ];

    res.json({ success: true, members });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch team members' });
  }
});

// Invite team member
router.post('/invite', authenticateToken, async (req, res) => {
  try {
    const { email, role } = req.body;
    const userId = req.user.userId;

    if (!email || !role) {
      return res.status(400).json({ success: false, error: 'Email and role are required' });
    }

    // Validate role
    const validRoles = ['viewer', 'member', 'manager', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    // In production:
    // 1. Check if user has permission to invite (must be admin or manager)
    // 2. Check if email already exists in organization
    // 3. Generate invitation token
    // 4. Send invitation email
    // 5. Store invitation in database with expiry

    console.log(`📧 Sending invitation to ${email} with role: ${role}`);

    // Simulate sending invitation
    const invitation = {
      id: Date.now(),
      email,
      role,
      status: 'pending',
      invitedBy: userId,
      invitedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };

    res.json({
      success: true,
      message: `Invitation sent to ${email}`,
      invitation
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ success: false, error: 'Failed to send invitation' });
  }
});

// Update member role
router.put('/members/:memberId/role', authenticateToken, async (req, res) => {
  try {
    const { memberId } = req.params;
    const { role } = req.body;
    const userId = req.user.userId;

    if (!role) {
      return res.status(400).json({ success: false, error: 'Role is required' });
    }

    // Validate role
    const validRoles = ['viewer', 'member', 'manager', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    // In production:
    // 1. Check if user has permission (must be admin or manager)
    // 2. Check if member exists in organization
    // 3. Prevent removing last admin
    // 4. Update role in database
    // 5. Log audit trail

    console.log(`🔄 Updating member ${memberId} role to: ${role}`);

    res.json({
      success: true,
      message: 'Role updated successfully',
      member: {
        id: memberId,
        role,
        updatedAt: new Date().toISOString(),
        updatedBy: userId
      }
    });
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({ success: false, error: 'Failed to update role' });
  }
});

// Remove team member
router.delete('/members/:memberId', authenticateToken, async (req, res) => {
  try {
    const { memberId } = req.params;
    const userId = req.user.userId;

    // In production:
    // 1. Check if user has permission (must be admin)
    // 2. Check if member exists in organization
    // 3. Prevent removing last admin
    // 4. Remove member from database
    // 5. Revoke access tokens
    // 6. Log audit trail
    // 7. Notify removed member

    console.log(`🗑️ Removing member ${memberId} from organization`);

    res.json({
      success: true,
      message: 'Team member removed successfully'
    });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({ success: false, error: 'Failed to remove team member' });
  }
});

// Get team activity log
router.get('/activity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // In production, fetch from database
    const activities = [
      {
        id: 1,
        type: 'member_invited',
        user: 'John Doe',
        details: 'Invited jane@leadsync.com as Manager',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        type: 'role_changed',
        user: 'John Doe',
        details: 'Changed Bob Johnson role from Member to Manager',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        type: 'member_removed',
        user: 'John Doe',
        details: 'Removed Sarah Wilson from team',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    res.json({ success: true, activities });
  } catch (error) {
    console.error('Error fetching activity log:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch activity log' });
  }
});

// Get team permissions
router.get('/permissions', authenticateToken, async (req, res) => {
  try {
    const permissions = {
      viewer: {
        canView: true,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canInvite: false,
        canManageTeam: false
      },
      member: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canInvite: false,
        canManageTeam: false
      },
      manager: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canInvite: true,
        canManageTeam: false
      },
      admin: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canInvite: true,
        canManageTeam: true
      }
    };

    res.json({ success: true, permissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch permissions' });
  }
});

// Accept invitation (public endpoint)
router.post('/accept-invitation/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password, name } = req.body;

    // In production:
    // 1. Validate invitation token
    // 2. Check if token is expired
    // 3. Create user account
    // 4. Add user to organization
    // 5. Send welcome email
    // 6. Return auth token

    console.log(`✅ Accepting invitation with token: ${token}`);

    res.json({
      success: true,
      message: 'Invitation accepted successfully',
      token: 'mock_auth_token_' + Date.now()
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ success: false, error: 'Failed to accept invitation' });
  }
});

module.exports = router;
