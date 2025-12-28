import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Icons from './Icons';
import './TeamManagement.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function TeamManagement() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('leadsync_token');
      const response = await axios.get(`${API_URL}/api/team/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeamMembers(response.data.members || []);
    } catch (error) {
      console.error('Error loading team members:', error);
      // Demo data for now
      setTeamMembers([
        {
          id: 1,
          name: 'John Doe',
          email: 'john@leadsync.com',
          role: 'admin',
          status: 'active',
          joinedAt: '2024-01-15',
          lastActive: '2024-03-20'
        },
        {
          id: 2,
          name: 'Jane Smith',
          email: 'jane@leadsync.com',
          role: 'manager',
          status: 'active',
          joinedAt: '2024-02-01',
          lastActive: '2024-03-19'
        },
        {
          id: 3,
          name: 'Bob Johnson',
          email: 'bob@leadsync.com',
          role: 'member',
          status: 'active',
          joinedAt: '2024-02-15',
          lastActive: '2024-03-18'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('leadsync_token');
      await axios.post(
        `${API_URL}/api/team/invite`,
        { email: inviteEmail, role: inviteRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('member');

      setTimeout(() => {
        loadTeamMembers();
        setSuccess('');
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to send invitation');
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      const token = localStorage.getItem('leadsync_token');
      await axios.put(
        `${API_URL}/api/team/members/${memberId}/role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Role updated successfully');
      setTimeout(() => setSuccess(''), 2000);
      loadTeamMembers();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update role');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    try {
      const token = localStorage.getItem('leadsync_token');
      await axios.delete(`${API_URL}/api/team/members/${memberId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Team member removed');
      setTimeout(() => setSuccess(''), 2000);
      loadTeamMembers();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to remove member');
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: { label: 'Admin', color: '#EC4899', icon: <Icons.Settings size={14} color="#ffffff" /> },
      manager: { label: 'Manager', color: '#8B5CF6', icon: <Icons.TrendingUp size={14} color="#ffffff" /> },
      member: { label: 'Member', color: '#3B82F6', icon: <Icons.Users size={14} color="#ffffff" /> },
      viewer: { label: 'Viewer', color: '#64748B', icon: <Icons.Eye size={14} color="#ffffff" /> }
    };
    return badges[role] || badges.member;
  };

  const getStatusColor = (status) => {
    return status === 'active' ? '#a855f7' : '#94A3B8';
  };

  return (
    <div className="team-management">
      <div className="team-header">
        <div>
          <h1>
            <Icons.Team size={32} style={{ marginRight: '12px', verticalAlign: 'middle' }} color="#8B5CF6" />
            Team Management
          </h1>
          <p className="team-subtitle">Manage your team members and their access levels</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      {/* Invite Form */}
      <div className="invite-section">
        <h2>Invite Team Member</h2>
        <form onSubmit={handleInvite} className="invite-form">
          <div className="form-row">
            <input
              type="email"
              placeholder="Email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="invite-input"
              required
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="invite-select"
            >
              <option value="viewer">Viewer - Read only access</option>
              <option value="member">Member - Create & edit</option>
              <option value="manager">Manager - Full access except billing</option>
              <option value="admin">Admin - Full access</option>
            </select>
            <button type="submit" className="btn-invite">
              Send Invite
            </button>
          </div>
        </form>
      </div>

      {/* Team Members List */}
      <div className="members-section">
        <h2>Team Members ({teamMembers.length})</h2>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading team members...</p>
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Icons.Users size={48} color="#8B5CF6" />
            </div>
            <h3>No team members yet</h3>
            <p>Invite your first team member to get started</p>
          </div>
        ) : (
          <div className="members-grid">
            {teamMembers.map((member) => {
              const badge = getRoleBadge(member.role);
              return (
                <div key={member.id} className="member-card">
                  <div className="member-header">
                    <div className="member-avatar">
                      {member.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="member-info">
                      <h3>{member.name}</h3>
                      <p className="member-email">{member.email}</p>
                    </div>
                    <div
                      className="status-indicator"
                      style={{ background: getStatusColor(member.status) }}
                      title={member.status}
                    />
                  </div>

                  <div className="member-details">
                    <div className="detail-row">
                      <span className="detail-label">Role</span>
                      <span
                        className="role-badge"
                        style={{ background: badge.color }}
                      >
                        {badge.icon} {badge.label}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Joined</span>
                      <span>{new Date(member.joinedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Last Active</span>
                      <span>{new Date(member.lastActive).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="member-actions">
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      className="role-select"
                      disabled={member.role === 'admin' && teamMembers.filter(m => m.role === 'admin').length === 1}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="member">Member</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      className="btn-remove"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={member.role === 'admin' && teamMembers.filter(m => m.role === 'admin').length === 1}
                      title={member.role === 'admin' && teamMembers.filter(m => m.role === 'admin').length === 1 ? 'Cannot remove the last admin' : 'Remove member'}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Permissions Info */}
      <div className="permissions-section">
        <h2>Role Permissions</h2>
        <div className="permissions-grid">
          <div className="permission-card">
            <div className="permission-header">
              <span className="permission-icon">
                <Icons.Eye size={24} color="#8B5CF6" />
              </span>
              <h3>Viewer</h3>
            </div>
            <ul className="permission-list">
              <li>
                <Icons.Check size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#a855f7" />
                View strategies
              </li>
              <li>
                <Icons.Check size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#a855f7" />
                View conversations
              </li>
              <li>
                <Icons.Check size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#a855f7" />
                View analytics
              </li>
              <li>
                <Icons.X size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#ef4444" />
                Cannot edit or create
              </li>
            </ul>
          </div>

          <div className="permission-card">
            <div className="permission-header">
              <span className="permission-icon">
                <Icons.Users size={24} color="#8B5CF6" />
              </span>
              <h3>Member</h3>
            </div>
            <ul className="permission-list">
              <li>
                <Icons.Check size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#a855f7" />
                All viewer permissions
              </li>
              <li>
                <Icons.Check size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#a855f7" />
                Create strategies
              </li>
              <li>
                <Icons.Check size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#a855f7" />
                Edit own strategies
              </li>
              <li>
                <Icons.Check size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#a855f7" />
                Manage conversations
              </li>
            </ul>
          </div>

          <div className="permission-card">
            <div className="permission-header">
              <span className="permission-icon">
                <Icons.TrendingUp size={24} color="#8B5CF6" />
              </span>
              <h3>Manager</h3>
            </div>
            <ul className="permission-list">
              <li>
                <Icons.Check size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#a855f7" />
                All member permissions
              </li>
              <li>
                <Icons.Check size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#a855f7" />
                Edit all strategies
              </li>
              <li>
                <Icons.Check size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#a855f7" />
                Delete strategies
              </li>
              <li>
                <Icons.Check size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#a855f7" />
                View team analytics
              </li>
            </ul>
          </div>

          <div className="permission-card">
            <div className="permission-header">
              <span className="permission-icon">
                <Icons.Settings size={24} color="#8B5CF6" />
              </span>
              <h3>Admin</h3>
            </div>
            <ul className="permission-list">
              <li>
                <Icons.Check size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#a855f7" />
                All manager permissions
              </li>
              <li>
                <Icons.Check size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#a855f7" />
                Manage team members
              </li>
              <li>
                <Icons.Check size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#a855f7" />
                Billing & settings
              </li>
              <li>
                <Icons.Check size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#a855f7" />
                Full system access
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeamManagement;
