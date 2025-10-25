import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useNavigation } from '../context/NavigationContext';
import PromptBuilder from './PromptBuilder';
import Modal from './Modal';
import './StrategyEditor.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function StrategyEditor() {
  const { id } = useParams();
  const {
    setHasUnsavedChanges: setGlobalUnsavedChanges,
    setOnSaveCallback,
    showUnsavedModal,
    saveAndProceed,
    proceedWithNavigation,
    cancelNavigation,
    routerNavigate
  } = useNavigation();
  const [activeStep, setActiveStep] = useState(1);
  const [showPromptBuilder, setShowPromptBuilder] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    tag: '',
    brief: '',
    tone: 'Friendly and Casual',
    initialMessage: '',
    objective: '',
    companyInformation: '',
    botTemperature: 0.4,
    resiliancy: 3,
    bookingReadiness: 2,
    messageDelayInitial: 30,
    messageDelayStandard: 5,
    objectionHandling: 75,
    qualificationPriority: 67,
    creativity: 40,
    cta: '',
    turnOffAiAfterCta: false,
    turnOffFollowUps: false,
    ghlContactId: ''
  });

  const [qualificationQuestions, setQualificationQuestionsRaw] = useState([]);
  const [followUps, setFollowUpsRaw] = useState([]);
  const [faqs, setFaqsRaw] = useState([]);

  // Wrapped setters with logging to track state changes
  const setQualificationQuestions = (value) => {
    console.log('🔄 setQualificationQuestions called with:', value?.length || 0, 'items');
    console.trace('Stack trace:');
    setQualificationQuestionsRaw(value);
  };

  const setFollowUps = (value) => {
    console.log('🔄 setFollowUps called with:', value?.length || 0, 'items');
    console.trace('Stack trace:');
    setFollowUpsRaw(value);
  };

  const setFaqs = (value) => {
    console.log('🔄 setFaqs called with:', value?.length || 0, 'items');
    console.trace('Stack trace:');
    setFaqsRaw(value);
  };
  const [qualificationEnabled, setQualificationEnabled] = useState(true);

  // Track unsaved changes locally
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalFormData, setOriginalFormData] = useState(null);

  // Modal state
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    onThird: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    thirdText: null
  });

  const isNewAgent = id === 'new';

  // Define handleSave with useCallback to capture current state
  const handleSave = useCallback(async () => {
    try {
      console.log('💾 Saving agent...', id);
      console.log('🔍 Current state at save time:');
      console.log('  faqs:', faqs.length);
      console.log('  qualificationQuestions:', qualificationQuestions.length);
      console.log('  followUps:', followUps.length);

      // Ensure required fields have defaults
      const dataToSave = {
        ...formData,
        initialMessage: formData.initialMessage || "Hey! Thanks for reaching out. Can you confirm this is {{contact.first_name}}?",
        brief: formData.brief || '',
        objective: formData.objective || 'Engage and qualify leads'
      };

      if (isNewAgent) {
        await axios.post(`${API_URL}/api/templates`, {
          ...dataToSave,
          faqs: faqs.length > 0 ? faqs : [],
          qualificationQuestions: qualificationQuestions.length > 0 ? qualificationQuestions : [
            { Body: JSON.stringify({ text: "What are you looking for today?" }), Delay: 1 }
          ],
          followUps: followUps.length > 0 ? followUps : [
            { Body: "Just checking in - still interested?", Delay: 180 }
          ],
          customActions: {
            APPOINTMENT_BOOKED: [{
              rule_condition: "Trigger when you agree and confirm a booking slot",
              chains: [{
                chain_name: "Confirm Booking",
                chain_order: 1,
                steps: [{ step_order: 1, function: "HANDLE_BOOKING", parameters: {} }]
              }]
            }]
          }
        });

        setHasUnsavedChanges(false);
        setModal({
          isOpen: true,
          title: 'Success',
          message: 'AI Agent created successfully!',
          onConfirm: () => {
            setModal(prev => ({ ...prev, isOpen: false }));
            routerNavigate('/strategies');
          },
          confirmText: 'OK',
          onCancel: null
        });
      } else {
        console.log('  Updating with nested data:', {
          faqs: faqs.length,
          questions: qualificationQuestions.length,
          followUps: followUps.length
        });
        console.log('📤 Sending data to backend:');
        console.log('  FAQs:', JSON.stringify(faqs, null, 2));
        console.log('  Questions:', JSON.stringify(qualificationQuestions, null, 2));
        console.log('  FollowUps:', JSON.stringify(followUps, null, 2));

        await axios.put(`${API_URL}/api/templates/${id}`, {
          ...dataToSave,
          faqs: faqs,
          qualificationQuestions: qualificationQuestions,
          followUps: followUps
        });

        setHasUnsavedChanges(false);
        setOriginalFormData(JSON.stringify({
          formData: dataToSave,
          faqs: faqs,
          qualificationQuestions: qualificationQuestions,
          followUps: followUps
        }));

        setModal({
          isOpen: true,
          title: 'Success',
          message: 'AI Agent updated successfully!',
          onConfirm: () => {
            setModal(prev => ({ ...prev, isOpen: false }));
            routerNavigate('/strategies');
          },
          confirmText: 'OK',
          onCancel: null
        });
      }
    } catch (error) {
      console.error('❌ Error saving agent:', error);
      console.error('Error details:', error.response?.data);

      setModal({
        isOpen: true,
        title: 'Error',
        message: `Failed to save agent: ${error.response?.data?.error || error.message}`,
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        confirmText: 'OK',
        onCancel: null
      });
    }
  }, [id, formData, faqs, qualificationQuestions, followUps, isNewAgent, routerNavigate]);

  // Sync local unsaved changes with global context
  useEffect(() => {
    setGlobalUnsavedChanges(hasUnsavedChanges);
  }, [hasUnsavedChanges, setGlobalUnsavedChanges]);

  // Register save callback with navigation context
  useEffect(() => {
    setOnSaveCallback(() => handleSave);
  }, [setOnSaveCallback, handleSave]);

  // Show modal when navigation is blocked by context
  useEffect(() => {
    if (showUnsavedModal) {
      setModal({
        isOpen: true,
        title: 'Unsaved Changes',
        message: 'You have unsaved changes to this AI Agent. Do you want to save before leaving?',
        onConfirm: saveAndProceed,
        onCancel: proceedWithNavigation,
        onThird: cancelNavigation,
        confirmText: 'Save & Continue',
        cancelText: 'Discard Changes',
        thirdText: 'Cancel'
      });
    } else {
      // Close modal if showUnsavedModal is false
      if (modal.isOpen && modal.title === 'Unsaved Changes') {
        setModal({ ...modal, isOpen: false });
      }
    }
  }, [showUnsavedModal, saveAndProceed, proceedWithNavigation, cancelNavigation]);

  useEffect(() => {
    if (!isNewAgent) {
      loadAgent();
    }
  }, [id]);

  // Browser close/refresh warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Changes you made may not be saved';
        return 'Changes you made may not be saved';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const loadAgent = async () => {
    try {
      console.log('📥 Loading agent:', id);
      const res = await axios.get(`${API_URL}/api/templates/${id}`);
      console.log('✅ Agent data loaded:', res.data);
      console.log('  Received FAQs:', res.data.faqs?.length || 0);
      console.log('  Received Questions:', res.data.qualificationQuestions?.length || 0);
      console.log('  Received Follow-ups:', res.data.followUps?.length || 0);

      // Set main form data
      console.log('🔧 Setting formData...');
      setFormData(res.data);

      // Save original data for comparison
      setOriginalFormData(JSON.stringify({
        formData: res.data,
        faqs: res.data.faqs || [],
        qualificationQuestions: res.data.qualificationQuestions || [],
        followUps: res.data.followUps || []
      }));

      // Set nested data arrays
      if (res.data.faqs && res.data.faqs.length > 0) {
        console.log('  Setting', res.data.faqs.length, 'FAQs');
        console.log('  FAQs data:', JSON.stringify(res.data.faqs, null, 2));
        setFaqs(res.data.faqs);
      } else {
        console.log('  ⚠️ No FAQs to set (received:', res.data.faqs, ')');
      }

      if (res.data.qualificationQuestions && res.data.qualificationQuestions.length > 0) {
        console.log('  Setting', res.data.qualificationQuestions.length, 'qualification questions');
        console.log('  Questions data:', JSON.stringify(res.data.qualificationQuestions, null, 2));
        setQualificationQuestions(res.data.qualificationQuestions);
      } else {
        console.log('  ⚠️ No questions to set (received:', res.data.qualificationQuestions, ')');
      }

      if (res.data.followUps && res.data.followUps.length > 0) {
        console.log('  Setting', res.data.followUps.length, 'follow-ups');
        console.log('  Follow-ups data:', JSON.stringify(res.data.followUps, null, 2));
        setFollowUps(res.data.followUps);
      } else {
        console.log('  ⚠️ No follow-ups to set (received:', res.data.followUps, ')');
      }

      console.log('✅ Load complete - state should now have data');
      // Reset unsaved changes flag
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('❌ Error loading agent:', error);
      console.error('Error details:', error.response?.data);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setHasUnsavedChanges(true);
  };

  const handlePromptSave = (generatedPrompt) => {
    setFormData({ ...formData, brief: generatedPrompt });
    setHasUnsavedChanges(true);
  };

  const handleNavigation = (path) => {
    if (hasUnsavedChanges) {
      setModal({
        isOpen: true,
        title: 'Unsaved Changes',
        message: 'You have unsaved changes to this AI Agent. Do you want to save before leaving?',
        onConfirm: async () => {
          setModal({ ...modal, isOpen: false });
          await handleSave();
          setHasUnsavedChanges(false);
          routerNavigate(path);
        },
        onCancel: () => {
          setModal({ ...modal, isOpen: false });
          setHasUnsavedChanges(false);
          routerNavigate(path);
        },
        onThird: () => {
          setModal({ ...modal, isOpen: false });
        },
        confirmText: 'Save & Continue',
        cancelText: 'Discard Changes',
        thirdText: 'Cancel'
      });
    } else {
      routerNavigate(path);
    }
  };

  const addQualificationQuestion = () => {
    setQualificationQuestions([...qualificationQuestions, { id: Date.now(), text: '', conditions: [] }]);
    setHasUnsavedChanges(true);
  };

  const removeQualificationQuestion = (id) => {
    setQualificationQuestions(qualificationQuestions.filter(q => q.id !== id));
    setHasUnsavedChanges(true);
  };

  const updateQualificationQuestion = (id, text) => {
    setQualificationQuestions(qualificationQuestions.map(q =>
      q.id === id ? { ...q, text } : q
    ));
    setHasUnsavedChanges(true);
  };

  const addFollowUp = () => {
    setFollowUps([...followUps, { id: Date.now(), text: '', delay: 180 }]);
    setHasUnsavedChanges(true);
  };

  const removeFollowUp = (id) => {
    setFollowUps(followUps.filter(f => f.id !== id));
    setHasUnsavedChanges(true);
  };

  const updateFollowUp = (id, field, value) => {
    setFollowUps(followUps.map(f =>
      f.id === id ? { ...f, [field]: value } : f
    ));
    setHasUnsavedChanges(true);
  };

  const addFaq = () => {
    setFaqs([...faqs, { id: Date.now(), question: '', answer: '', expanded: true }]);
    setHasUnsavedChanges(true);
  };

  const removeFaq = (id) => {
    setFaqs(faqs.filter(f => f.id !== id));
    setHasUnsavedChanges(true);
  };

  const updateFaq = (id, field, value) => {
    setFaqs(faqs.map(f =>
      f.id === id ? { ...f, [field]: value } : f
    ));
    setHasUnsavedChanges(true);
  };

  const toggleFaq = (id) => {
    setFaqs(faqs.map(f =>
      f.id === id ? { ...f, expanded: !f.expanded } : f
    ));
  };

  const steps = [
    { id: 1, name: 'Instructions', label: 'Step 1: Instructions' },
    { id: 2, name: 'Conversation', label: 'Step 2: Conversation' },
    { id: 3, name: 'Booking', label: 'Step 3: Booking' },
    { id: 4, name: 'Knowledge', label: 'Step 4: Knowledge' },
    { id: 5, name: 'Custom Tasks', label: 'Step 5: Custom Tasks', badge: 'Requires 7.0' }
  ];

  return (
    <div className="strategy-editor">
      <div className="editor-header">
        <div className="editor-title">
          <button className="btn-back" onClick={() => handleNavigation('/strategies')}>←</button>
          <h1>📝 {isNewAgent ? 'Create New Agent' : 'Edit Strategy'}</h1>
        </div>
        <div className="editor-actions">
          <button className="btn btn-secondary" onClick={() => handleNavigation('/strategies')}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save Strategy</button>
        </div>
      </div>

      <div className="step-tabs">
        {steps.map(step => (
          <button
            key={step.id}
            className={`step-tab ${activeStep === step.id ? 'active' : ''}`}
            onClick={() => setActiveStep(step.id)}
          >
            {step.label}
            {step.badge && <span className="step-badge">{step.badge}</span>}
          </button>
        ))}
      </div>

      <div className="step-content">
        {activeStep === 1 && (
          <div className="step-panel step-1-layout">
            <div className="main-config">
              {/* Top 3-column section */}
              <div className="config-row">
                <div className="config-field">
                  <label>📝 Strategy Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Gyms Template"
                  />
                </div>

                <div className="config-field">
                  <label>🏷️ GHL Tag *</label>
                  <input
                    type="text"
                    name="tag"
                    value={formData.tag}
                    onChange={handleChange}
                    placeholder="e.g., gyms"
                  />
                </div>

                <div className="config-field">
                  <label>🎭 Tone</label>
                  <select name="tone" value={formData.tone} onChange={handleChange}>
                    <option>Friendly and Casual</option>
                    <option>Professional</option>
                    <option>Enthusiastic</option>
                    <option>Formal</option>
                  </select>
                </div>
              </div>

              {/* Prompt Editor Section */}
              <div className="prompt-section">
                <div className="prompt-section-header">
                  <h3>📝 Prompt Editor</h3>
                  <button
                    className="btn-build-prompt"
                    onClick={() => setShowPromptBuilder(true)}
                    type="button"
                  >
                    📦 Build My Prompt
                  </button>
                </div>
                <textarea
                  name="brief"
                  value={formData.brief}
                  onChange={handleChange}
                  className="prompt-textarea"
                  placeholder="Describe who the AI is, how it should behave, conversation rules..."
                />
              </div>
            </div>

            {/* Adjustments Panel - Right Sidebar */}
            <div className="adjustments-sidebar">
              <div className="adjustments-header">
                <h3>⚙️ Adjustments</h3>
                <span className="badge-requires">Requires 7.0</span>
              </div>

              {/* Time Inputs */}
              <div className="time-inputs">
                <div className="time-field">
                  <label>Initial Msg Delay</label>
                  <div className="time-input-group">
                    <input type="number" min="0" max="23" value="00" placeholder="00" />
                    <span>hr</span>
                    <input type="number" min="0" max="59" value="00" placeholder="00" />
                    <span>min</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={formData.messageDelayInitial || 30}
                      onChange={(e) => setFormData({...formData, messageDelayInitial: e.target.value})}
                      placeholder="30"
                    />
                    <span>sec</span>
                  </div>
                </div>

                <div className="time-field">
                  <label>Response Delay</label>
                  <div className="time-input-group">
                    <input type="number" min="0" max="23" value="00" placeholder="00" />
                    <span>hr</span>
                    <input type="number" min="0" max="59" value="00" placeholder="00" />
                    <span>min</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={formData.messageDelayStandard || 5}
                      onChange={(e) => setFormData({...formData, messageDelayStandard: e.target.value})}
                      placeholder="05"
                    />
                    <span>sec</span>
                  </div>
                </div>
              </div>

              {/* Sliders */}
              <div className="slider-list">
                <div className="slider-item">
                  <div className="slider-header">
                    <span className="slider-label">Objection Handling</span>
                    <span className="slider-badge">{formData.objectionHandling}%</span>
                  </div>
                  <div className="slider-track">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.objectionHandling}
                      onChange={(e) => setFormData({...formData, objectionHandling: e.target.value})}
                    />
                  </div>
                  <span className="slider-description">Top Closer</span>
                </div>

                <div className="slider-item">
                  <div className="slider-header">
                    <span className="slider-label">Qualification Priority</span>
                    <span className="slider-badge">{formData.qualificationPriority}%</span>
                  </div>
                  <div className="slider-track">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.qualificationPriority}
                      onChange={(e) => setFormData({...formData, qualificationPriority: e.target.value})}
                    />
                  </div>
                  <span className="slider-description">Balanced</span>
                </div>

                <div className="slider-item">
                  <div className="slider-header">
                    <span className="slider-label">Creativity</span>
                    <span className="slider-badge">{formData.creativity}%</span>
                  </div>
                  <div className="slider-track">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.creativity}
                      onChange={(e) => setFormData({...formData, creativity: e.target.value})}
                    />
                  </div>
                  <span className="slider-description">Stick to the Script</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeStep === 2 && (
          <div className="step-panel">
            {/* Initial Message */}
            <div className="section">
              <div className="section-header-row">
                <h3>💬 Initial Message</h3>
                <button className="btn-gradient-sm">+ Add Template</button>
              </div>
              <textarea
                name="initialMessage"
                value={formData.initialMessage}
                onChange={handleChange}
                className="dark-textarea"
                placeholder="Hey it's Sam from Company. Can you confirm this is {{contact.first_name}}?"
                rows={4}
              />
            </div>

            {/* Qualification Questions */}
            <div className="section">
              <div className="section-header-row">
                <div className="header-left">
                  <h3>❓ Qualification Questions</h3>
                  <span className="count-badge">{qualificationQuestions.length}</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={qualificationEnabled}
                    onChange={(e) => setQualificationEnabled(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                  <span className="toggle-label">Turn off qualification</span>
                </label>
              </div>

              <div className="items-list">
                {qualificationQuestions.map((q, index) => (
                  <div key={q.id} className="item-card">
                    <div className="item-header">
                      <span className="item-label">Q{index + 1}</span>
                      <button className="btn-icon-delete" onClick={() => removeQualificationQuestion(q.id)}>✕</button>
                    </div>
                    <textarea
                      value={q.text}
                      onChange={(e) => updateQualificationQuestion(q.id, e.target.value)}
                      className="item-textarea"
                      placeholder="Enter qualification question..."
                      rows={2}
                    />
                    <div className="item-actions">
                      <button className="btn-icon-sm">🏷️</button>
                      <button className="btn-secondary-sm">+ Add Condition</button>
                    </div>
                  </div>
                ))}

                <button className="btn-add-dashed" onClick={addQualificationQuestion}>
                  + Add Qualification Question
                </button>
              </div>
            </div>

            {/* Follow Ups */}
            <div className="section">
              <div className="section-header-row">
                <div className="header-left">
                  <h3>🔄 Follow Ups</h3>
                  <span className="count-badge">{followUps.length}</span>
                </div>
              </div>

              <div className="items-list">
                {followUps.map((f, index) => (
                  <div key={f.id} className="item-card">
                    <div className="item-header">
                      <span className="item-label">F{index + 1}</span>
                      <button className="btn-icon-delete" onClick={() => removeFollowUp(f.id)}>✕</button>
                    </div>
                    <textarea
                      value={f.text}
                      onChange={(e) => updateFollowUp(f.id, 'text', e.target.value)}
                      className="item-textarea"
                      placeholder="Enter follow-up message..."
                      rows={2}
                    />
                    <div className="item-actions">
                      <button className="btn-icon-sm">🏷️</button>
                      <div className="delay-input">
                        <label>Delay:</label>
                        <input
                          type="number"
                          value={f.delay}
                          onChange={(e) => updateFollowUp(f.id, 'delay', e.target.value)}
                          min="0"
                        />
                        <span>seconds</span>
                      </div>
                    </div>
                  </div>
                ))}

                <button className="btn-gradient-sm" onClick={addFollowUp}>
                  + Add Template
                </button>
              </div>
            </div>
          </div>
        )}

        {activeStep === 3 && (
          <div className="step-panel step-3-layout">
            <div className="main-section">
              {/* Automated AI Booking Card */}
              <div className="info-card-blue">
                <div className="info-icon">✨</div>
                <div className="info-content">
                  <h3>Automated AI Booking</h3>
                  <p>Connect your GHL calendar, and the AI will book directly into it through conversational AI.</p>
                </div>
              </div>

              {/* Call-to-Action Highlight */}
              <div className="cta-highlight-card">
                <div className="cta-highlight-header">
                  <span className="cta-icon">🎯</span>
                  <h3>Call-to-Action</h3>
                </div>
                <p>This is the final message before attempting to book or complete the objective</p>
              </div>

              {/* CTA Textarea */}
              <div className="section">
                <label>💬 Call-to-Action Message</label>
                <textarea
                  name="cta"
                  value={formData.cta}
                  onChange={handleChange}
                  className="dark-textarea"
                  placeholder="Let's schedule a quick call to discuss how we can help..."
                  rows={4}
                />
              </div>

              {/* GHL Contact ID */}
              <div className="section">
                <label>🔗 GHL Contact ID (for testing)</label>
                <input
                  type="text"
                  name="ghlContactId"
                  value={formData.ghlContactId}
                  onChange={handleChange}
                  className="dark-input"
                  placeholder="Enter GHL contact ID for testing..."
                />
              </div>
            </div>

            {/* Right Panel - Toggles */}
            <div className="toggles-panel">
              <h3>⚙️ Settings</h3>

              <div className="toggle-item">
                <label className="toggle-switch-full">
                  <div className="toggle-info">
                    <span className="toggle-title">Turn off AI after CTA</span>
                    <span className="toggle-description">AI will stop responding after call-to-action</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={formData.turnOffAiAfterCta}
                      onChange={(e) => setFormData({...formData, turnOffAiAfterCta: e.target.checked})}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </label>
              </div>

              <div className="toggle-item">
                <label className="toggle-switch-full">
                  <div className="toggle-info">
                    <span className="toggle-title">Turn off follow-ups</span>
                    <span className="toggle-description">Disable automated follow-up messages</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={formData.turnOffFollowUps}
                      onChange={(e) => setFormData({...formData, turnOffFollowUps: e.target.checked})}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeStep === 4 && (
          <div className="step-panel">
            {/* Company Information */}
            <div className="section">
              <h3>🏢 Company Information</h3>
              <textarea
                name="companyInformation"
                value={formData.companyInformation}
                onChange={handleChange}
                className="dark-textarea"
                placeholder="Brief description of your company and services..."
                rows={6}
              />
            </div>

            {/* FAQs */}
            <div className="section">
              <div className="section-header-row">
                <div className="header-left">
                  <h3>❓ FAQs</h3>
                  <span className="count-badge">{faqs.length}</span>
                </div>
              </div>

              <div className="items-list">
                {faqs.map((faq, index) => (
                  <div key={faq.id} className="faq-card">
                    <div className="faq-header" onClick={() => toggleFaq(faq.id)}>
                      <div className="faq-title">
                        <span className="faq-icon">{faq.expanded ? '▼' : '▶'}</span>
                        <span className="faq-label">Question {index + 1}</span>
                      </div>
                      <button
                        className="btn-icon-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFaq(faq.id);
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    {faq.expanded && (
                      <div className="faq-content">
                        <div className="faq-field">
                          <label>Question</label>
                          <textarea
                            value={faq.question}
                            onChange={(e) => updateFaq(faq.id, 'question', e.target.value)}
                            className="item-textarea"
                            placeholder="Enter question..."
                            rows={2}
                          />
                        </div>

                        <div className="faq-field">
                          <label>Answer</label>
                          <textarea
                            value={faq.answer}
                            onChange={(e) => updateFaq(faq.id, 'answer', e.target.value)}
                            className="item-textarea"
                            placeholder="Enter answer..."
                            rows={3}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <button className="btn-add-dashed" onClick={addFaq}>
                  + Add FAQ
                </button>
              </div>
            </div>
          </div>
        )}

        {activeStep === 5 && (
          <div className="step-panel">
            <div className="coming-soon">
              <h2>🚀 Custom Tasks & Workflows</h2>
              <p>Visual workflow builder coming soon!</p>
              <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
                This feature allows you to create custom automation workflows with triggers and actions.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* PromptBuilder Modal */}
      <PromptBuilder
        isOpen={showPromptBuilder}
        onClose={() => setShowPromptBuilder(false)}
        onSave={handlePromptSave}
        initialBrief={formData.brief}
      />

      {/* Modal for alerts/confirms */}
      <Modal
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm}
        onCancel={modal.onCancel}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
      />
    </div>
  );
}

export default StrategyEditor;