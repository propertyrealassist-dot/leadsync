import React, { useState, useRef, useEffect } from 'react';
import { useOrganization } from '../context/OrganizationContext';
import './OrganizationSwitcher.css';

function OrganizationSwitcher() {
  const { organizations, currentOrganization, switchOrganization, createOrganization } = useOrganization();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [creating, setCreating] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
        setShowCreateForm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateOrganization = async (e) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setCreating(true);
    const result = await createOrganization(newOrgName.trim());

    if (result.success) {
      setNewOrgName('');
      setShowCreateForm(false);
      setShowDropdown(false);
    } else {
      alert(result.error || 'Failed to create organization');
    }
    setCreating(false);
  };

  // If no organizations exist, show create button
  if (!currentOrganization && organizations.length === 0) {
    return (
      <div className="org-switcher" ref={dropdownRef}>
        <button
          className="org-switcher-button"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <div className="org-icon">
            <span>+</span>
          </div>
          <span className="org-name">Create Organization</span>
          <span className="org-arrow">▼</span>
        </button>

        {showDropdown && (
          <div className="org-dropdown">
            <div className="org-dropdown-header">
              <span>Get Started</span>
            </div>

            {showCreateForm ? (
              <form className="org-create-form" onSubmit={handleCreateOrganization}>
                <input
                  type="text"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Organization name"
                  autoFocus
                  disabled={creating}
                />
                <div className="org-create-actions">
                  <button
                    type="button"
                    className="org-cancel-button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewOrgName('');
                    }}
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="org-submit-button" disabled={creating || !newOrgName.trim()}>
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            ) : (
              <button
                className="org-create-button"
                onClick={() => setShowCreateForm(true)}
              >
                ➕ Create Your First Organization
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (!currentOrganization) return null;

  return (
    <div className="org-switcher" ref={dropdownRef}>
      <button
        className="org-switcher-button"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <div className="org-icon">
          {currentOrganization.logo_url ? (
            <img src={currentOrganization.logo_url} alt={currentOrganization.name} />
          ) : (
            <span>{currentOrganization.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <span className="org-name">{currentOrganization.name}</span>
        <span className="org-arrow">▼</span>
      </button>

      {showDropdown && (
        <div className="org-dropdown">
          <div className="org-dropdown-header">
            <span>Organizations</span>
          </div>

          <div className="org-list">
            {organizations.map((org) => (
              <button
                key={org.id}
                className={`org-item ${currentOrganization.id === org.id ? 'active' : ''}`}
                onClick={() => {
                  switchOrganization(org.id);
                  setShowDropdown(false);
                }}
              >
                <div className="org-item-icon">
                  {org.logo_url ? (
                    <img src={org.logo_url} alt={org.name} />
                  ) : (
                    <span>{org.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="org-item-info">
                  <span className="org-item-name">{org.name}</span>
                  <span className="org-item-role">{org.role}</span>
                </div>
                {currentOrganization.id === org.id && (
                  <span className="org-item-check">✓</span>
                )}
              </button>
            ))}
          </div>

          <div className="org-dropdown-divider"></div>

          {!showCreateForm ? (
            <button
              className="org-create-button"
              onClick={() => setShowCreateForm(true)}
            >
              ➕ Create New Organization
            </button>
          ) : (
            <form className="org-create-form" onSubmit={handleCreateOrganization}>
              <input
                type="text"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="Organization name"
                autoFocus
                disabled={creating}
              />
              <div className="org-create-actions">
                <button
                  type="button"
                  className="org-cancel-button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewOrgName('');
                  }}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button type="submit" className="org-submit-button" disabled={creating || !newOrgName.trim()}>
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default OrganizationSwitcher;
