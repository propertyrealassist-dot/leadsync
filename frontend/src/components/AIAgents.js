import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import Modal from './Modal';
import Icons from './Icons';
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
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: null });
  const fileInputRef = React.useRef(null);
  const menuButtonRef = React.useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdown && !event.target.closest('.strategy-actions-dropdown')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  // CRITICAL: Expose loadData to window so StrategyEditor can refresh the list
  useEffect(() => {
    window.refreshAgentList = loadData;
    console.log('✅ Registered window.refreshAgentList');
    return () => {
      delete window.refreshAgentList;
      console.log('🗑️ Unregistered window.refreshAgentList');
    };
  }, []);

  const loadData = async () => {
    try {
      console.log('🔄 Loading agents and conversations...');
      const token = localStorage.getItem('token');

      const [agentsRes, conversationsRes] = await Promise.all([
        axios.get(`${API_URL}/api/templates`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/conversations`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setAgents(agentsRes.data);
      setConversations(conversationsRes.data);
      console.log('✅ Loaded', agentsRes.data.length, 'agents');
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load strategies');
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
    const newName = prompt('Enter name for duplicated strategy:', `${agent.name} (Copy)`);

    if (!newName) return;

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        alert('Not authenticated. Please log in again.');
        return;
      }

      console.log('📋 Duplicating agent:', agent.id);

      const response = await axios.post(
        `${API_URL}/api/templates/${agent.id}/duplicate`,
        { newName },
        { headers: { Authorization: `Bearer ${token}` }}
      );

      console.log('✅ Agent duplicated:', response.data);
      alert('Strategy duplicated successfully!');

      // Reload agents
      loadData();

    } catch (error) {
      console.error('❌ Duplication failed:', error);
      alert('Failed to duplicate strategy: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDuplicateAgentOld = async (agent) => {
    setShowMenu(null);

    // Create a custom modal with input for the new name
    const DuplicateModal = () => {
      const [newName, setNewName] = React.useState(`${agent.name} (Copy)`);
      const [duplicating, setDuplicating] = React.useState(false);

      const performDuplicate = async () => {
        if (!newName.trim()) {
          toast.error('Please enter a name for the duplicate strategy');
          return;
        }

        setDuplicating(true);
        try {
          console.log('📋 Duplicating strategy:', agent.id);
          console.log('📋 New name:', newName);

          // Call the new duplicate endpoint
          const response = await axios.post(
            `${API_URL}/api/templates/${agent.id}/duplicate`,
            { customName: newName.trim() },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          console.log('✅ Duplicate successful:', response.data);

          toast.success(`Strategy "${newName}" duplicated successfully!`);
          setModal({ ...modal, isOpen: false });

          // Reload the strategies list
          loadData();
        } catch (error) {
          console.error('❌ Error duplicating strategy:', error);
          console.error('❌ Error response:', error.response?.data);

          toast.error('Failed to duplicate strategy: ' + (error.response?.data?.error || error.message));
        } finally {
          setDuplicating(false);
        }
      };

      return (
        <div className="modal-body">
          <p style={{ marginBottom: '24px', color: 'rgba(255,255,255,0.7)' }}>
            Create a copy of: <strong>{agent.name}</strong>
          </p>

          <div className="form-group">
            <label>New Strategy Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter name for duplicate"
              className="form-input"
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px'
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !duplicating) {
                  performDuplicate();
                }
              }}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button
              onClick={() => setModal({ ...modal, isOpen: false })}
              disabled={duplicating}
              style={{
                padding: '10px 20px',
                backgroundColor: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#fff',
                cursor: duplicating ? 'not-allowed' : 'pointer',
                opacity: duplicating ? 0.5 : 1
              }}
            >
              Cancel
            </button>
            <button
              onClick={performDuplicate}
              disabled={duplicating || !newName.trim()}
              style={{
                padding: '10px 20px',
                backgroundColor: duplicating || !newName.trim() ? 'rgba(99, 102, 241, 0.5)' : '#6366f1',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                cursor: duplicating || !newName.trim() ? 'not-allowed' : 'pointer',
                fontWeight: '500'
              }}
            >
              {duplicating ? 'Duplicating...' : 'Duplicate'}
            </button>
          </div>
        </div>
      );
    };

    setModal({
      isOpen: true,
      title: '📋 Duplicate Strategy',
      customContent: <DuplicateModal />,
      onConfirm: null, // Handled by the custom modal
      onCancel: () => setModal({ ...modal, isOpen: false })
    });
  };

  const handleDeleteAgent = async (agent) => {
    console.log('🗑️ Delete function called');
    console.log('📝 Agent:', agent);
    console.log('📝 Agent ID:', agent.id);

    if (!window.confirm(`Are you sure you want to delete "${agent.name}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        alert('Not authenticated. Please log in again.');
        return;
      }

      console.log('🗑️ Deleting agent:', agent.id);

      await axios.delete(`${API_URL}/api/templates/${agent.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('✅ Agent deleted successfully');
      alert('Strategy deleted successfully!');

      // Reload agents
      loadData();

    } catch (error) {
      console.error('❌ Delete failed:', error);
      alert('Failed to delete strategy: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteAgentOld = async (agent) => {
    console.log('🗑️ Delete function called');
    console.log('📝 Agent:', agent);
    console.log('📝 Agent ID:', agent?.id);
    console.log('📝 Agent ID type:', typeof agent?.id);

    setShowMenu(null);

    if (!agent || !agent.id) {
      console.error('❌ No agent or agent ID provided!');
      setModal({
        isOpen: true,
        title: '❌ Error',
        message: 'Error: No agent ID',
        onConfirm: () => setModal({ ...modal, isOpen: false }),
        confirmText: 'OK'
      });
      return;
    }

    setModal({
      isOpen: true,
      title: '⚠️ Delete Strategy',
      message: `Are you sure you want to delete "${agent.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          console.log('🔑 Token exists:', !!token);
          const url = `${API_URL}/api/templates/${agent.id}`;
          console.log('🌐 DELETE URL:', url);

          const response = await axios.delete(url, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          console.log('✅ Delete successful:', response.data);

          toast.success('Strategy deleted successfully!');
          setModal({ ...modal, isOpen: false });

          loadData();
        } catch (error) {
          console.error('❌ Delete failed:', error);
          console.error('❌ Error message:', error.message);
          console.error('❌ Error response:', error.response?.data);
          console.error('❌ Error status:', error.response?.status);

          setModal({
            isOpen: true,
            title: '❌ Error',
            message: 'Failed to delete strategy: ' + (error.response?.data?.error || error.message),
            onConfirm: () => setModal({ ...modal, isOpen: false }),
            confirmText: 'OK'
          });
        }
      },
      onCancel: () => setModal({ ...modal, isOpen: false }),
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });
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
      setModal({
        isOpen: true,
        title: '❌ Invalid File',
        message: 'Please select a valid JSON file',
        onConfirm: () => setModal({ ...modal, isOpen: false }),
        confirmText: 'OK'
      });
      return;
    }

    setImporting(true);
    try {
      const fileContent = await file.text();
      let importedData;

      try {
        importedData = JSON.parse(fileContent);
      } catch (error) {
        setModal({
          isOpen: true,
          title: '❌ Invalid JSON',
          message: 'Invalid JSON file. Please check the file format.',
          onConfirm: () => setModal({ ...modal, isOpen: false }),
          confirmText: 'OK'
        });
        setImporting(false);
        return;
      }

      console.log('📥 Original imported data:', importedData);

      // Validate required fields
      if (!importedData.name) {
        setModal({
          isOpen: true,
          title: '❌ Invalid Strategy File',
          message: 'Invalid strategy file. Missing required field: name',
          onConfirm: () => setModal({ ...modal, isOpen: false }),
          confirmText: 'OK'
        });
        setImporting(false);
        return;
      }

      // Transform imported data to internal format
      const transformedData = transformImportedStrategy(importedData);
      console.log('🔄 Transformed data:', transformedData);

      // Check for duplicate name
      const duplicateName = agents.some(a => a.name.toLowerCase() === transformedData.name.toLowerCase());
      if (duplicateName) {
        setModal({
          isOpen: true,
          title: '⚠️ Duplicate Name',
          message: `An agent named "${transformedData.name}" already exists. Import anyway? (It will be renamed)`,
          onConfirm: async () => {
            transformedData.name = `${transformedData.name} (Imported)`;
            setModal({ ...modal, isOpen: false });
            // Continue with import
            try {
              // Check for warnings
              const warnings = transformedData._warnings;
              delete transformedData._warnings; // Remove warnings before sending to API
              delete transformedData.id;

              const response = await axios.post(`${API_URL}/api/templates`, transformedData, {
                headers: { Authorization: `Bearer ${token}` }
              });

              const warningText = warnings && warnings.length > 0
                ? ` (${warnings.length} field(s) could not be parsed)`
                : '';

              toast.success(`Strategy "${transformedData.name}" imported successfully!${warningText}`);
              setModal({ ...modal, isOpen: false });

              loadData();
            } catch (error) {
              console.error('❌ Error importing strategy:', error);
              const errorMsg = error.response?.status === 404
                ? `Endpoint not found. Server returned 404 for ${API_URL}/api/templates`
                : error.response?.data?.error || error.message || 'Unknown error';

              toast.error(`Failed to import strategy: ${errorMsg}`);
            } finally {
              setImporting(false);
            }
          },
          onCancel: () => {
            setModal({ ...modal, isOpen: false });
            setImporting(false);
          },
          confirmText: 'Import Anyway',
          cancelText: 'Cancel'
        });
        return;
      }

      // Remove id if present (let backend generate new one)
      delete transformedData.id;

      console.log('🚀 IMPORT - About to send request');
      console.log('🔗 URL:', `${API_URL}/api/templates`);
      console.log('📦 Data being sent:', JSON.stringify(transformedData, null, 2));
      console.log('🔑 Token:', token ? 'Present' : 'Missing');

      // Check for warnings
      const warnings = transformedData._warnings;
      delete transformedData._warnings; // Remove warnings before sending to API

      // Import the strategy
      const response = await axios.post(`${API_URL}/api/templates`, transformedData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Import API response:', response.data);

      const warningText = warnings && warnings.length > 0
        ? ` (${warnings.length} field(s) could not be parsed)`
        : '';

      toast.success(`Strategy "${transformedData.name}" imported successfully!${warningText}`);

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

      toast.error(`Failed to import strategy: ${errorMsg}`);
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

    // Log any parsing errors (will show warning after successful import)
    if (errors.length > 0) {
      console.warn('⚠️ Some fields could not be parsed:', errors);
      transformed._warnings = errors; // Attach warnings to be shown after import
    }

    return transformed;
  };

  const handleExportAgent = async (agent) => {
    try {
      setExporting(true);

      // Fetch full agent data with all nested resources
      const response = await axios.get(`${API_URL}/api/templates/${agent.id}`);
      const agentData = response.data;

      console.log('📤 EXPORT - Full agent data:', agentData);

      // Format the export data - INCLUDE ALL FIELDS FROM ALL 5 STEPS
      const exportData = {
        // Step 1: Basic Info
        name: agentData.name || '',
        tag: agentData.tag || '',
        tone: agentData.tone || 'Friendly and Casual',
        brief: agentData.brief || '',
        objective: agentData.objective || '',
        companyInformation: agentData.company_information || agentData.companyInformation || '',
        initialMessage: agentData.initial_message || agentData.initialMessage || '',

        // Step 2: FAQs
        faqs: Array.isArray(agentData.faqs) ? agentData.faqs.map(faq => ({
          question: faq.question || '',
          answer: faq.answer || '',
          delay: faq.delay || 1
        })) : [],

        // Step 3: Qualification Questions
        qualificationQuestions: Array.isArray(agentData.qualificationQuestions) ? agentData.qualificationQuestions.map(q => ({
          text: q.text || '',
          conditions: q.conditions || [],
          delay: q.delay || 1
        })) : [],

        // Step 4: Follow-ups
        followUps: Array.isArray(agentData.followUps) ? agentData.followUps.map(f => ({
          message: f.text || f.body || f.message || '',
          delay: f.delay || 180
        })) : [],

        // Step 5: Custom Actions (Triggers & Chains)
        customActions: agentData.customActions || agentData.custom_actions || [],

        // Settings
        settings: {
          botTemperature: agentData.bot_temperature || agentData.botTemperature || 0.4,
          resiliancy: agentData.resiliancy || 3,
          bookingReadiness: agentData.booking_readiness || agentData.bookingReadiness || 2,
          messageDelayInitial: agentData.message_delay_initial || agentData.messageDelayInitial || 30,
          messageDelayStandard: agentData.message_delay_standard || agentData.messageDelayStandard || 5,
          cta: agentData.cta || '',
          turnOffAiAfterCta: agentData.turn_off_ai_after_cta || agentData.turnOffAiAfterCta || false,
          turnOffFollowUps: agentData.turn_off_follow_ups || agentData.turnOffFollowUps || false
        }
      };

      console.log('📤 EXPORT - Formatted data:', exportData);
      console.log('📤 EXPORT - FAQs:', exportData.faqs.length);
      console.log('📤 EXPORT - Questions:', exportData.qualificationQuestions.length);
      console.log('📤 EXPORT - Follow-ups:', exportData.followUps.length);
      console.log('📤 EXPORT - Custom actions:', exportData.customActions.length);

      // Create filename with date - use leadsync prefix
      const date = new Date().toISOString().split('T')[0];
      const filename = `leadsync-${agentData.name.toLowerCase().replace(/\s+/g, '-')}-${date}.json`;

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

      toast.success(`Strategy exported as "${filename}"`);
    } catch (error) {
      console.error('Error exporting strategy:', error);

      toast.error('Failed to export strategy: ' + (error.response?.data?.error || error.message));
    } finally {
      setExporting(false);
      setShowMenu(null);
    }
  };

  const handleBulkExport = async () => {
    if (selectedAgents.length === 0) {
      setModal({
        isOpen: true,
        title: '⚠️ No Selection',
        message: 'Please select at least one agent to export',
        onConfirm: () => setModal({ ...modal, isOpen: false }),
        confirmText: 'OK'
      });
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

      toast.success(`Exported ${selectedAgents.length} strategies successfully!`);

      setSelectedAgents([]);
    } catch (error) {
      console.error('Error bulk exporting strategies:', error);

      toast.error('Failed to export some strategies: ' + (error.message || 'Unknown error'));
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
          <h1>
            <Icons.Target size={32} style={{ marginRight: '12px', verticalAlign: 'middle' }} color="#8B5CF6" />
            AI Agents
          </h1>
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
            {importing ? (
              <>
                <Icons.Clock size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#fff" />
                Importing...
              </>
            ) : (
              <>
                <Icons.Download size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#fff" />
                Import Strategy
              </>
            )}
          </button>
          <button className="btn-create-agent" onClick={handleCreateNew}>
            <Icons.Plus size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#fff" />
            Create New Agent
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
          onKeyPress={(e) => e.key === 'Enter' && setSearchTerm(e.target.value)}
          className="agents-search-input"
        />
        <button
          className="agents-search-button"
          onClick={() => setSearchTerm(searchTerm)}
          title="Search"
        >
          <Icons.Search size={20} color="#fff" />
        </button>
      </div>

      {/* Agents Table */}
      {filteredAgents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Icons.Target size={80} color="#8B5CF6" />
          </div>
          <h3>No AI Agents Yet</h3>
          <p>Create your first AI agent to start automating conversations</p>
          <button className="btn-primary" onClick={handleCreateNew}>
            <Icons.Plus size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#fff" />
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
                    <td className="strategy-name" data-label="Strategy Name">
                      <div className="strategy-name-content">
                        <span className="status-dot active"></span>
                        <span className="name-text">{agent.name}</span>
                      </div>
                    </td>
                    <td data-label="GHL Tag">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="tag-badge">{agent.tag}</span>
                        <button
                          className="copy-tag-btn icon-spin"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(agent.tag);
                            toast.success(`Tag "${agent.tag}" copied to clipboard!`);
                            // Show temporary feedback
                            const btn = e.currentTarget;
                            const originalHTML = btn.innerHTML;
                            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                            setTimeout(() => {
                              btn.innerHTML = originalHTML;
                            }, 1000);
                          }}
                          title="Copy tag to clipboard"
                        >
                          <Icons.Copy size={16} color="#8B5CF6" />
                        </button>
                      </div>
                    </td>
                    <td className="stat-cell" data-label="Total Leads">{stats.totalLeads}</td>
                    <td className="stat-cell active" data-label="Active Leads">{stats.activeLeads}</td>
                    <td className="stat-cell won" data-label="Leads Won">{stats.leadsWon}</td>
                    <td className="stat-cell opt-out" data-label="Opt-Out">{stats.optOut}</td>
                    <td className="stat-cell" data-label="Response Rate">
                      <span className={`response-rate ${stats.responseRate >= 70 ? 'good' : stats.responseRate >= 40 ? 'medium' : 'low'}`}>
                        {stats.responseRate}%
                      </span>
                    </td>
                    <td className="actions-col" onClick={(e) => e.stopPropagation()}>
                      <div className="action-buttons">
                        <div className="strategy-actions-dropdown">
                          <button
                            className="action-btn settings-btn icon-spin"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdown(openDropdown === agent.id ? null : agent.id);
                            }}
                            title="Settings"
                          >
                            <Icons.Settings size={18} color="#8B5CF6" />
                          </button>

                          {openDropdown === agent.id && (
                            <div className="dropdown-menu">
                              <button
                                className="dropdown-item"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditAgent(agent.id);
                                  setOpenDropdown(null);
                                }}
                              >
                                <Icons.Edit size={16} />
                                <span>Edit</span>
                              </button>

                              <button
                                className="dropdown-item"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportAgent(agent);
                                  setOpenDropdown(null);
                                }}
                              >
                                <Icons.Download size={16} />
                                <span>Export</span>
                              </button>

                              <div className="dropdown-divider"></div>

                              <button
                                className="dropdown-item danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdown(null);
                                  handleDeleteAgent(agent);
                                }}
                              >
                                <Icons.Trash size={16} />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="menu-wrapper">
                          <button
                            ref={menuButtonRef}
                            className="action-btn menu-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              const isOpen = showMenu === agent.id;
                              setShowMenu(isOpen ? null : agent.id);

                              if (!isOpen) {
                                // Calculate position to keep menu in viewport
                                const rect = e.currentTarget.getBoundingClientRect();
                                const menuHeight = 200; // Approximate menu height
                                const menuWidth = 150;

                                let top = rect.bottom + 8;
                                let left = rect.right - menuWidth;

                                // Adjust if menu goes off bottom of screen
                                if (top + menuHeight > window.innerHeight) {
                                  top = rect.top - menuHeight - 8;
                                }

                                // Adjust if menu goes off left of screen
                                if (left < 8) {
                                  left = 8;
                                }

                                // Adjust if menu goes off right of screen
                                if (left + menuWidth > window.innerWidth - 8) {
                                  left = window.innerWidth - menuWidth - 8;
                                }

                                setMenuPosition({ top, left });
                              }
                            }}
                            title="More options"
                          >
                            ⋯
                          </button>
                          {showMenu === agent.id && (
                            <div
                              className="action-menu"
                              style={{
                                top: `${menuPosition.top}px`,
                                left: `${menuPosition.left}px`
                              }}
                            >
                              <button onClick={() => handleEditAgent(agent.id)}>
                                <Icons.Edit size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#8B5CF6" />
                                Edit
                              </button>
                              <button onClick={() => handleDuplicateAgent(agent)}>
                                <Icons.Copy size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#8B5CF6" />
                                Duplicate
                              </button>
                              <button onClick={() => handleExportAgent(agent)} disabled={exporting}>
                                <Icons.Upload size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#8B5CF6" />
                                Export
                              </button>
                              <button onClick={() => handleDeleteAgent(agent)} className="delete-option">
                                <Icons.Trash size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#ef4444" />
                                Delete
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
              {exporting ? (
                <>
                  <Icons.Clock size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#fff" />
                  Exporting...
                </>
              ) : (
                <>
                  <Icons.Upload size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#fff" />
                  Export Selected
                </>
              )}
            </button>
            <button className="bulk-btn">Activate</button>
            <button className="bulk-btn">Pause</button>
            <button className="bulk-btn delete">Delete</button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal.isOpen && (
        <Modal
          title={modal.title}
          message={modal.message}
          onConfirm={modal.onConfirm}
          onCancel={modal.onCancel}
          confirmText={modal.confirmText}
          cancelText={modal.cancelText}
        />
      )}
    </div>
  );
}

export default AIAgents;
