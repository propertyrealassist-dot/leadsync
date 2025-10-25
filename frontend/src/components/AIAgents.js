import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './AIAgents.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function AIAgents() {
  const { token } = useAuth();
  const [agents, setAgents] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMenu, setShowMenu] = useState(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileInputRef = React.useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [agentsRes, conversationsRes] = await Promise.all([
        axios.get(`${API_URL}/api/templates`),
        axios.get(`${API_URL}/api/conversations`)
      ]);

      setAgents(agentsRes.data);
      setConversations(conversationsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAgentStats = (agentId, templateName) => {
    const agentConversations = conversations.filter(c =>
      c.template_id === agentId || c.template_name === templateName
    );

    return {
      totalLeads: agentConversations.length,
      activeLeads: agentConversations.filter(c => c.status === 'active').length,
      leadsWon: agentConversations.filter(c => c.status === 'completed' || c.status === 'booked').length,
      optOut: agentConversations.filter(c => c.status === 'failed').length,
      responseRate: agentConversations.length > 0
        ? Math.round((agentConversations.filter(c => c.status !== 'failed').length / agentConversations.length) * 100)
        : 0
    };
  };

  const handleSelectAgent = (agentId) => {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAgents.length === agents.length) {
      setSelectedAgents([]);
    } else {
      setSelectedAgents(agents.map(a => a.id));
    }
  };

  const handleEditAgent = (agentId) => {
    navigate(`/ai-agents/edit/${agentId}`);
  };

  const handleDuplicateAgent = async (agent) => {
    try {
      const duplicatedAgent = {
        ...agent,
        id: undefined,
        name: `${agent.name} (Copy)`,
        tag: `${agent.tag}-copy`
      };

      await axios.post(`${API_URL}/api/templates`, duplicatedAgent);
      alert('Agent duplicated successfully!');
      loadData();
    } catch (error) {
      console.error('Error duplicating agent:', error);
      alert('Failed to duplicate agent');
    }
    setShowMenu(null);
  };

  const handleDeleteAgent = async (agentId) => {
    if (!window.confirm('Are you sure you want to delete this AI agent?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/templates/${agentId}`);
      alert('Agent deleted successfully!');
      loadData();
    } catch (error) {
      console.error('Error deleting agent:', error);
      alert('Failed to delete agent');
    }
    setShowMenu(null);
  };

  const handleCreateNew = () => {
    navigate('/strategy/new');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.json')) {
      alert('Please select a valid JSON file');
      return;
    }

    setImporting(true);
    try {
      const fileContent = await file.text();
      let importedData;

      try {
        importedData = JSON.parse(fileContent);
      } catch (error) {
        alert('Invalid JSON file. Please check the file format.');
        setImporting(false);
        return;
      }

      console.log('📥 Original imported data:', importedData);

      // Validate required fields
      if (!importedData.name) {
        alert('Invalid strategy file. Missing required field: name');
        setImporting(false);
        return;
      }

      // Transform imported data to internal format
      const transformedData = transformImportedStrategy(importedData);
      console.log('🔄 Transformed data:', transformedData);

      // Check for duplicate name
      const duplicateName = agents.some(a => a.name.toLowerCase() === transformedData.name.toLowerCase());
      if (duplicateName) {
        const confirmImport = window.confirm(
          `An agent named "${transformedData.name}" already exists. Import anyway? (It will be renamed)`
        );
        if (!confirmImport) {
          setImporting(false);
          return;
        }
        transformedData.name = `${transformedData.name} (Imported)`;
      }

      // Remove id if present (let backend generate new one)
      delete transformedData.id;

      console.log('🚀 IMPORT - About to send request');
      console.log('🔗 URL:', `${API_URL}/api/templates`);
      console.log('📦 Data being sent:', JSON.stringify(transformedData, null, 2));
      console.log('🔑 Token:', token ? 'Present' : 'Missing');

      // Import the strategy
      const response = await axios.post(`${API_URL}/api/templates`, transformedData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Import API response:', response.data);

      alert(`✅ Strategy "${transformedData.name}" imported successfully!`);
      loadData();
    } catch (error) {
      console.error('❌ Error importing strategy:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error response status:', error.response?.status);
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      console.error('❌ Request URL was:', `${API_URL}/api/templates`);

      const errorMsg = error.response?.status === 404
        ? `Endpoint not found. Server returned 404 for ${API_URL}/api/templates`
        : error.response?.data?.error || error.message || 'Unknown error';

      alert(`Failed to import strategy: ${errorMsg}`);
    } finally {
      setImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const transformImportedStrategy = (imported) => {
    const errors = [];

    // Helper function to safely parse JSON strings
    const safeJsonParse = (jsonString, fieldName, index) => {
      if (!jsonString) return null;
      try {
        return JSON.parse(jsonString);
      } catch (error) {
        const errorMsg = `Failed to parse ${fieldName}${index !== undefined ? ` #${index + 1}` : ''}`;
        console.warn(errorMsg, error);
        errors.push(errorMsg);
        return null;
      }
    };

    // Parse FAQs
    const faqs = [];
    if (Array.isArray(imported.faqs)) {
      imported.faqs.forEach((faq, index) => {
        if (faq.Body) {
          const parsed = safeJsonParse(faq.Body, 'FAQ', index);
          if (parsed && parsed.question && parsed.answer) {
            faqs.push({
              question: parsed.question,
              answer: parsed.answer
            });
          }
        } else if (faq.question && faq.answer) {
          // Already in correct format
          faqs.push({
            question: faq.question,
            answer: faq.answer
          });
        }
      });
    }

    // Parse qualification questions
    const qualificationQuestions = [];
    if (Array.isArray(imported.qualificationQuestions)) {
      imported.qualificationQuestions.forEach((q, index) => {
        if (q.Body) {
          const parsed = safeJsonParse(q.Body, 'Question', index);
          if (parsed && parsed.text) {
            qualificationQuestions.push({
              text: parsed.text,
              conditions: parsed.conditions || []
            });
          }
        } else if (q.text) {
          // Already in correct format
          qualificationQuestions.push({
            text: q.text,
            conditions: q.conditions || []
          });
        }
      });
    }

    // Parse follow-ups
    const followUps = [];
    if (Array.isArray(imported.followUps)) {
      imported.followUps.forEach((followUp, index) => {
        if (followUp.Body) {
          followUps.push({
            message: followUp.Body,
            delay: followUp.Delay || 3600000 // Default 1 hour
          });
        } else if (followUp.message) {
          // Already in correct format
          followUps.push({
            message: followUp.message,
            delay: followUp.delay || 3600000
          });
        }
      });
    }

    // Parse custom actions
    const customActions = [];
    if (imported.customActions && typeof imported.customActions === 'object') {
      Object.keys(imported.customActions).forEach((actionType) => {
        const action = imported.customActions[actionType];
        if (action && typeof action === 'object') {
          customActions.push({
            type: actionType,
            enabled: action.enabled !== false,
            config: action.config || action
          });
        }
      });
    } else if (Array.isArray(imported.customActions)) {
      // Already in array format
      customActions.push(...imported.customActions);
    }

    // Build transformed strategy
    const transformed = {
      name: imported.name,
      tag: imported.tag || imported.name.toLowerCase().replace(/\s+/g, '-'),
      tone: imported.tone || 'Friendly and Professional',
      goal: imported.objective || imported.goal || 'Engage and qualify leads',
      context: imported.companyInformation || imported.context || '',
      instructions: imported.brief || imported.instructions || '',
      faqs: faqs,
      qualification_questions: qualificationQuestions,
      follow_ups: followUps,
      custom_actions: customActions,
      settings: {
        booking_enabled: imported.settings?.booking_enabled || false,
        booking_url: imported.settings?.booking_url || imported.cta || '',
        message_delay: imported.messageDelayStandard || imported.settings?.message_delay || 2000,
        max_messages: imported.settings?.max_messages || 50,
        initial_message: imported.initialMessage || imported.settings?.initial_message || ''
      }
    };

    // Log any parsing errors
    if (errors.length > 0) {
      console.warn('⚠️ Some fields could not be parsed:', errors);
      alert(`Import succeeded with ${errors.length} warning(s). Check console for details.`);
    }

    return transformed;
  };

  const handleExportAgent = async (agent) => {
    try {
      setExporting(true);

      // Fetch full agent data with all nested resources
      const response = await axios.get(`${API_URL}/api/templates/${agent.id}`);
      const agentData = response.data;

      // Format the export data
      const exportData = {
        name: agentData.name,
        tag: agentData.tag,
        tone: agentData.tone || 'professional',
        goal: agentData.goal || '',
        context: agentData.context || '',
        instructions: agentData.instructions || '',
        faqs: agentData.faqs || [],
        qualification_questions: agentData.qualification_questions || [],
        follow_ups: agentData.follow_ups || [],
        custom_actions: agentData.custom_actions || [],
        settings: {
          booking_enabled: agentData.booking_enabled || false,
          booking_url: agentData.booking_url || '',
          message_delay: agentData.message_delay || 2000,
          max_messages: agentData.max_messages || 50
        }
      };

      // Create filename with date
      const date = new Date().toISOString().split('T')[0];
      const filename = `strategy-${agentData.name.toLowerCase().replace(/\s+/g, '-')}-${date}.json`;

      // Trigger download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert(`✅ Strategy exported successfully as "${filename}"`);
    } catch (error) {
      console.error('Error exporting strategy:', error);
      alert('Failed to export strategy');
    } finally {
      setExporting(false);
      setShowMenu(null);
    }
  };

  const handleBulkExport = async () => {
    if (selectedAgents.length === 0) {
      alert('Please select at least one agent to export');
      return;
    }

    try {
      setExporting(true);
      const date = new Date().toISOString().split('T')[0];

      for (const agentId of selectedAgents) {
        const agent = agents.find(a => a.id === agentId);
        if (agent) {
          await handleExportAgent(agent);
          // Small delay between downloads to prevent browser blocking
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      alert(`✅ Exported ${selectedAgents.length} strategies successfully!`);
      setSelectedAgents([]);
    } catch (error) {
      console.error('Error bulk exporting strategies:', error);
      alert('Failed to export some strategies');
    } finally {
      setExporting(false);
    }
  };

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.tag.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="loading">Loading AI agents...</div>;
  }

  return (
    <div className="ai-agents-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>🤖 AI Agents</h1>
          <p className="page-subtitle">Manage your AI conversation strategies</p>
        </div>
        <div className="header-actions">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileImport}
            accept=".json"
            style={{ display: 'none' }}
          />
          <button
            className="btn-import-agent"
            onClick={handleImportClick}
            disabled={importing}
          >
            {importing ? '⏳ Importing...' : '📥 Import Strategy'}
          </button>
          <button className="btn-create-agent" onClick={handleCreateNew}>
            ✨ Create New Agent
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="agents-search-bar">
        <input
          type="text"
          placeholder="Search agents by name or tag..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="agents-search-input"
        />
      </div>

      {/* Agents Table */}
      {filteredAgents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🤖</div>
          <h3>No AI Agents Yet</h3>
          <p>Create your first AI agent to start automating conversations</p>
          <button className="btn-primary" onClick={handleCreateNew}>
            Create Your First Agent
          </button>
        </div>
      ) : (
        <div className="agents-table-wrapper">
          <table className="agents-table">
            <thead>
              <tr>
                <th className="checkbox-col">
                  <input
                    type="checkbox"
                    checked={selectedAgents.length === agents.length && agents.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>Strategy Name</th>
                <th>GHL Tag</th>
                <th>Total Leads</th>
                <th>Active Leads</th>
                <th>Leads Won</th>
                <th>Opt-Out</th>
                <th>Response Rate</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAgents.map((agent) => {
                const stats = getAgentStats(agent.id, agent.name);
                return (
                  <tr
                    key={agent.id}
                    className="agent-row"
                    onClick={() => handleEditAgent(agent.id)}
                  >
                    <td className="checkbox-col" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedAgents.includes(agent.id)}
                        onChange={() => handleSelectAgent(agent.id)}
                      />
                    </td>
                    <td className="strategy-name">
                      <div className="strategy-name-content">
                        <span className="status-dot active"></span>
                        <span className="name-text">{agent.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="tag-badge">{agent.tag}</span>
                    </td>
                    <td className="stat-cell">{stats.totalLeads}</td>
                    <td className="stat-cell active">{stats.activeLeads}</td>
                    <td className="stat-cell won">{stats.leadsWon}</td>
                    <td className="stat-cell opt-out">{stats.optOut}</td>
                    <td className="stat-cell">
                      <span className={`response-rate ${stats.responseRate >= 70 ? 'good' : stats.responseRate >= 40 ? 'medium' : 'low'}`}>
                        {stats.responseRate}%
                      </span>
                    </td>
                    <td className="actions-col" onClick={(e) => e.stopPropagation()}>
                      <div className="action-buttons">
                        <button
                          className="action-btn settings-btn"
                          onClick={() => handleEditAgent(agent.id)}
                          title="Settings"
                        >
                          ⚙️
                        </button>
                        <div className="menu-wrapper">
                          <button
                            className="action-btn menu-btn"
                            onClick={() => setShowMenu(showMenu === agent.id ? null : agent.id)}
                            title="More options"
                          >
                            ⋯
                          </button>
                          {showMenu === agent.id && (
                            <div className="action-menu">
                              <button onClick={() => handleEditAgent(agent.id)}>
                                ✏️ Edit
                              </button>
                              <button onClick={() => handleDuplicateAgent(agent)}>
                                📋 Duplicate
                              </button>
                              <button onClick={() => handleExportAgent(agent)} disabled={exporting}>
                                💾 Export
                              </button>
                              <button onClick={() => handleDeleteAgent(agent.id)} className="delete-option">
                                🗑️ Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk Actions (if any selected) */}
      {selectedAgents.length > 0 && (
        <div className="bulk-actions-bar">
          <span className="selected-count">{selectedAgents.length} selected</span>
          <div className="bulk-action-buttons">
            <button
              className="bulk-btn"
              onClick={handleBulkExport}
              disabled={exporting}
            >
              {exporting ? '⏳ Exporting...' : '💾 Export Selected'}
            </button>
            <button className="bulk-btn">Activate</button>
            <button className="bulk-btn">Pause</button>
            <button className="bulk-btn delete">Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIAgents;
