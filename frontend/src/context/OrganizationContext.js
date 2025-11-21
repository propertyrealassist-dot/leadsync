import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const OrganizationContext = createContext();

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export function OrganizationProvider({ children }) {
  const [organizations, setOrganizations] = useState([]);
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}/api/organizations`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setOrganizations(response.data);

      // Set current organization from localStorage or use first one
      const savedOrgId = localStorage.getItem('currentOrganizationId');
      const currentOrg = savedOrgId
        ? response.data.find(org => org.id === savedOrgId)
        : response.data[0];

      if (currentOrg) {
        setCurrentOrganization(currentOrg);
        localStorage.setItem('currentOrganizationId', currentOrg.id);
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchOrganization = (organizationId) => {
    const org = organizations.find(o => o.id === organizationId);
    if (org) {
      setCurrentOrganization(org);
      localStorage.setItem('currentOrganizationId', org.id);
      // Force page reload to refresh all data for the new organization
      window.location.reload();
    }
  };

  const createOrganization = async (name) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/organizations`,
        { name },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        await loadOrganizations();
        return { success: true, organization: response.data.organization };
      }

      return { success: false, error: 'Failed to create organization' };
    } catch (error) {
      console.error('Create organization error:', error);
      return { success: false, error: error.response?.data?.error || 'Failed to create organization' };
    }
  };

  const value = {
    organizations,
    currentOrganization,
    loading,
    loadOrganizations,
    switchOrganization,
    createOrganization
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
}
