import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AIAgents.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

function AIAgents() {
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
        axios.get(`${API_URL}/templates`),
        axios.get(`${API_URL}/conversations`)
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

      await axios.post(`${API_URL}/templates`, duplicatedAgent);
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
      await axios.delete(`${API_URL}/templates/${agentId}`);
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
      let strategyData;

      try {
        strategyData = JSON.parse(fileContent);
      } catch (error) {
        alert('Invalid JSON file. Please check the file format.');
        setImporting(false);
        return;
      }

      // Validate required fields
      if (!strategyData.name || !strategyData.tag) {
        alert('Invalid strategy file. Missing required fields (name, tag).');
        setImporting(false);
        return;
      }

      // Check for duplicate name
      const duplicateName = agents.some(a => a.name.toLowerCase() === strategyData.name.toLowerCase());
      if (duplicateName) {
        const confirmImport = window.confirm(
          `An agent named "${strategyData.name}" already exists. Import anyway? (It will be renamed)`
        );
        if (!confirmImport) {
          setImporting(false);
          return;
        }
        strategyData.name = `${strategyData.name} (Imported)`;
      }

      // Remove id if present (let backend generate new one)
      delete strategyData.id;

      // Import the strategy
      await axios.post(`${API_URL}/templates`, strategyData);
      alert(`✅ Strategy "${strategyData.name}" imported successfully!`);
      loadData();
    } catch (error) {
      console.error('Error importing strategy:', error);
      alert('Failed to import strategy. Please check the file format and try again.');
    } finally {
      setImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleExportAgent = async (agent) => {
    try {
      setExporting(true);

      // Fetch full agent data with all nested resources
      const response = await axios.get(`${API_URL}/templates/${agent.id}`);
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
