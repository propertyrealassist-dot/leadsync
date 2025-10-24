import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PromptBuilder from './PromptBuilder';
import './StrategyEditor.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

function StrategyEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
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

  const [qualificationQuestions, setQualificationQuestions] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [qualificationEnabled, setQualificationEnabled] = useState(true);

  const isNewAgent = id === 'new';

  useEffect(() => {
    if (!isNewAgent) {
      loadAgent();
    }
  }, [id]);

  const loadAgent = async () => {
    try {
      const res = await axios.get(`${API_URL}/templates/${id}`);
      setFormData(res.data);
    } catch (error) {
      console.error('Error loading agent:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async () => {
    try {
      if (isNewAgent) {
        await axios.post(`${API_URL}/templates`, {
          ...formData,
          qualificationQuestions: [
            { Body: JSON.stringify({ text: "What are you looking for today?" }), Delay: 1 }
          ],
          followUps: [
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
        alert('AI Agent created successfully!');
      } else {
        await axios.put(`${API_URL}/templates/${id}`, formData);
        alert('AI Agent updated successfully!');
      }
      navigate('/strategies');
    } catch (error) {
      console.error('Error saving agent:', error);
      alert('Error saving agent');
    }
  };

  const handlePromptSave = (generatedPrompt) => {
    setFormData({ ...formData, brief: generatedPrompt });
  };

  const addQualificationQuestion = () => {
    setQualificationQuestions([...qualificationQuestions, { id: Date.now(), text: '', conditions: [] }]);
  };

  const removeQualificationQuestion = (id) => {
    setQualificationQuestions(qualificationQuestions.filter(q => q.id !== id));
  };

  const updateQualificationQuestion = (id, text) => {
    setQualificationQuestions(qualificationQuestions.map(q =>
      q.id === id ? { ...q, text } : q
    ));
  };

  const addFollowUp = () => {
    setFollowUps([...followUps, { id: Date.now(), text: '', delay: 180 }]);
  };

  const removeFollowUp = (id) => {
    setFollowUps(followUps.filter(f => f.id !== id));
  };

  const updateFollowUp = (id, field, value) => {
    setFollowUps(followUps.map(f =>
      f.id === id ? { ...f, [field]: value } : f
    ));
  };

  const addFaq = () => {
    setFaqs([...faqs, { id: Date.now(), question: '', answer: '', expanded: true }]);
  };

  const removeFaq = (id) => {
    setFaqs(faqs.filter(f => f.id !== id));
  };

  const updateFaq = (id, field, value) => {
    setFaqs(faqs.map(f =>
      f.id === id ? { ...f, [field]: value } : f
    ));
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
          <button className="btn-back" onClick={() => navigate('/strategies')}>←</button>
          <h1>📝 {isNewAgent ? 'Create New Agent' : 'Edit Strategy'}</h1>
        </div>
        <div className="editor-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/strategies')}>Cancel</button>
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
    </div>
  );
}

export default StrategyEditor;