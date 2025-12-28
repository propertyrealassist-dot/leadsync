import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';

// Import new components
import {
  StrategyCard,
  StrategySection,
  StrategyInput,
  StrategyToggle,
  SearchBar,
  MonacoPromptEditor,
  ModernSlider,
  LabeledSlider,
  TimePickerGroup,
  QuestionCard,
  FollowUpCard,
  FAQCard,
  IntegrationCard,
  TaskCard,
  ToggleSection,
  DraggableItem
} from './strategy';

import '../styles/strategy.css';
import '../styles/design-system.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function StrategyEditorNew() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNewAgent = !id || id === 'new';

  // Active tab state
  const [activeTab, setActiveTab] = useState(1);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    tag: '',
    brief: '',
    tone: 'Friendly and Casual',
    initialMessage: '',
    objective: '',
    companyInformation: '',
    bot_temperature: 0.4,
    messageDelayInitial: 0,
    messageDelayStandard: 1,
    objectionHandling: 8,
    qualificationPriority: 6,
    creativity: 0.4,
    cta: '',
    ghlCalendarId: ''
  });

  // Lists
  const [qualificationQuestions, setQualificationQuestions] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [faqs, setFaqs] = useState([]);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [integrationFilter, setIntegrationFilter] = useState('All');

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // Load strategy data
  useEffect(() => {
    if (!isNewAgent) {
      loadStrategy();
    }
  }, [id]);

  const loadStrategy = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/templates/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = response.data;
      setFormData({
        name: data.name || '',
        tag: data.tag || '',
        brief: data.brief || '',
        tone: data.tone || 'Friendly and Casual',
        initialMessage: data.initial_message || '',
        objective: data.objective || '',
        companyInformation: data.company_information || '',
        bot_temperature: data.bot_temperature || 0.4,
        messageDelayInitial: data.message_delay_initial || 0,
        messageDelayStandard: data.message_delay_standard || 1,
        objectionHandling: data.objection_handling || 8,
        qualificationPriority: data.qualification_priority || 6,
        creativity: data.creativity || 0.4,
        cta: data.cta || '',
        ghlCalendarId: data.ghl_calendar_id || ''
      });

      // Load questions, follow-ups, FAQs
      if (data.qualification_questions) {
        setQualificationQuestions(data.qualification_questions.map((q, i) => ({
          id: `q-${i}`,
          text: q.text || q.Body
        })));
      }

      if (data.follow_ups) {
        setFollowUps(data.follow_ups.map((f, i) => ({
          id: `f-${i}`,
          message: f.message || f.Body,
          delay: f.delay || f.Delay || 3
        })));
      }

      if (data.faqs) {
        setFaqs(data.faqs.map((faq, i) => ({
          id: `faq-${i}`,
          question: faq.question,
          answer: faq.answer,
          delay: faq.delay || 1
        })));
      }

      toast.success('Strategy loaded');
    } catch (error) {
      console.error('Error loading strategy:', error);
      toast.error('Failed to load strategy');
    }
  };

  // Save strategy
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        qualificationQuestions: qualificationQuestions.map(q => ({ text: q.text })),
        followUps: followUps.map(f => ({ message: f.message, delay: f.delay })),
        faqs: faqs.map(faq => ({ question: faq.question, answer: faq.answer, delay: faq.delay }))
      };

      let response;
      if (isNewAgent) {
        response = await axios.post(`${API_URL}/api/templates`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Strategy created!');
        navigate(`/strategy/${response.data.id}`);
      } else {
        response = await axios.put(`${API_URL}/api/templates/${id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Strategy saved!');
      }

      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save strategy');
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard shortcut (Cmd+S / Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formData, qualificationQuestions, followUps, faqs]);

  // Auto-save every 30 seconds if there are unsaved changes
  useEffect(() => {
    if (hasUnsavedChanges && !isNewAgent) {
      const timer = setTimeout(() => {
        handleSave();
        toast.success('Auto-saved', { duration: 2000 });
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [hasUnsavedChanges, formData, qualificationQuestions, followUps, faqs]);

  // Track changes
  const updateFormData = (updates) => {
    setFormData({ ...formData, ...updates });
    setHasUnsavedChanges(true);
  };

  // Question handlers
  const addQuestion = () => {
    const newQ = {
      id: `q-${Date.now()}`,
      text: ''
    };
    setQualificationQuestions([...qualificationQuestions, newQ]);
    setHasUnsavedChanges(true);
  };

  const updateQuestion = (id, newText) => {
    setQualificationQuestions(qualificationQuestions.map(q =>
      q.id === id ? { ...q, text: newText } : q
    ));
    setHasUnsavedChanges(true);
  };

  const deleteQuestion = (id) => {
    setQualificationQuestions(qualificationQuestions.filter(q => q.id !== id));
    setHasUnsavedChanges(true);
  };

  const handleDragEnd = (event, list, setList) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setList((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setHasUnsavedChanges(true);
    }
  };

  // Follow-up handlers
  const addFollowUp = () => {
    const newF = {
      id: `f-${Date.now()}`,
      message: '',
      delay: 3
    };
    setFollowUps([...followUps, newF]);
    setHasUnsavedChanges(true);
  };

  const updateFollowUp = (id, updates) => {
    setFollowUps(followUps.map(f =>
      f.id === id ? { ...f, ...updates } : f
    ));
    setHasUnsavedChanges(true);
  };

  const deleteFollowUp = (id) => {
    setFollowUps(followUps.filter(f => f.id !== id));
    setHasUnsavedChanges(true);
  };

  // FAQ handlers
  const addFAQ = () => {
    const newFaq = {
      id: `faq-${Date.now()}`,
      question: '',
      answer: '',
      delay: 1
    };
    setFaqs([...faqs, newFaq]);
    setHasUnsavedChanges(true);
  };

  const updateFAQ = (id, updates) => {
    setFaqs(faqs.map(faq =>
      faq.id === id ? { ...faq, ...updates } : faq
    ));
    setHasUnsavedChanges(true);
  };

  const deleteFAQ = (id) => {
    setFaqs(faqs.filter(faq => faq.id !== id));
    setHasUnsavedChanges(true);
  };

  // Tab navigation
  const tabs = [
    { id: 1, name: 'Instructions', icon: '📝' },
    { id: 2, name: 'Conversation', icon: '💬' },
    { id: 3, name: 'Booking', icon: '📅' },
    { id: 4, name: 'Knowledge', icon: '📚' },
    { id: 5, name: 'Custom Tasks', icon: '⚡' }
  ];

  return (
    <div style={{ background: 'var(--strategy-bg-base)', minHeight: '100vh', padding: '24px' }}>
      <Toaster position="top-right" />

      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--strategy-text-primary)', marginBottom: '8px' }}>
            {isNewAgent ? 'Create New Strategy' : 'Edit Strategy'}
          </h1>
          <p style={{ color: 'var(--strategy-text-secondary)', fontSize: '0.9375rem' }}>
            {hasUnsavedChanges && '● Unsaved changes'}
          </p>
        </div>
        <button
          className="strategy-btn strategy-btn-primary"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Strategy'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: '32px', display: 'flex', gap: '8px', borderBottom: '1px solid var(--strategy-border)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              background: activeTab === tab.id ? 'var(--strategy-bg-card)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--strategy-accent)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--strategy-text-primary)' : 'var(--strategy-text-secondary)',
              fontSize: '0.9375rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'var(--strategy-transition)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>{tab.icon}</span>
            {tab.name}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="strategy-fade-in">
        {/* TAB 1: INSTRUCTIONS - PIXEL PERFECT */}
        {activeTab === 1 && (
          <div>
            {/* Three-Column Header Row */}
            <div className="ds-grid-3 ds-spacer-2xl">
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--font-sm)',
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-sm)',
                  fontWeight: 'var(--font-weight-medium)'
                }}>
                  Strategy Name
                </label>
                <input
                  type="text"
                  className="ds-input"
                  value={formData.name}
                  onChange={(e) => updateFormData({ name: e.target.value })}
                  placeholder="Enter strategy name..."
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--font-sm)',
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-sm)',
                  fontWeight: 'var(--font-weight-medium)'
                }}>
                  GHL Tag
                </label>
                <input
                  type="text"
                  className="ds-input"
                  value={formData.tag}
                  onChange={(e) => updateFormData({ tag: e.target.value })}
                  placeholder="Enter tag..."
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--font-sm)',
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-sm)',
                  fontWeight: 'var(--font-weight-medium)'
                }}>
                  Tone
                </label>
                <select
                  className="ds-select"
                  value={formData.tone}
                  onChange={(e) => updateFormData({ tone: e.target.value })}
                >
                  <option value="Friendly and Casual">Friendly and Casual</option>
                  <option value="Professional">Professional</option>
                  <option value="Enthusiastic">Enthusiastic</option>
                  <option value="Formal">Formal</option>
                </select>
              </div>
            </div>

            {/* Prompt Section with Build My Prompt Button */}
            <div className="ds-spacer-2xl">
              <div className="ds-section-header">
                <h2 style={{
                  fontSize: 'var(--font-xl)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--text-primary)',
                  margin: 0
                }}>
                  Prompt
                </h2>
                <button className="ds-btn ds-btn-primary">
                  Build My Prompt
                </button>
              </div>

              <MonacoPromptEditor
                value={formData.brief}
                onChange={(value) => updateFormData({ brief: value })}
                placeholder="Enter your AI prompt instructions here..."
                height="400px"
              />
            </div>

            {/* Adjustments Section */}
            <div className="ds-spacer-2xl">
              <h2 style={{
                fontSize: 'var(--font-xl)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-primary)',
                marginBottom: 'var(--space-2xl)'
              }}>
                Adjustments
              </h2>

              {/* Time Pickers Row */}
              <div className="ds-grid-2 ds-spacer-2xl">
                <TimePickerGroup
                  label="Initial Message Delay"
                  value={{
                    hours: Math.floor(formData.messageDelayInitial / 3600),
                    minutes: Math.floor((formData.messageDelayInitial % 3600) / 60),
                    seconds: formData.messageDelayInitial % 60
                  }}
                  onChange={(time) => updateFormData({
                    messageDelayInitial: (time.hours * 3600) + (time.minutes * 60) + time.seconds
                  })}
                />

                <TimePickerGroup
                  label="Response Delay"
                  value={{
                    hours: Math.floor(formData.messageDelayStandard / 3600),
                    minutes: Math.floor((formData.messageDelayStandard % 3600) / 60),
                    seconds: formData.messageDelayStandard % 60
                  }}
                  onChange={(time) => updateFormData({
                    messageDelayStandard: (time.hours * 3600) + (time.minutes * 60) + time.seconds
                  })}
                />
              </div>

              {/* Sliders */}
              <LabeledSlider
                icon="🛡️"
                label="Objection Handling"
                value={formData.objectionHandling}
                onChange={(value) => updateFormData({ objectionHandling: value })}
                min={0}
                max={10}
                step={1}
                valueFormatter={(v) => `${v}/10`}
                labels={[
                  "The Avoider",      // 0-2
                  "The Listener",     // 3-5
                  "The Persuader",    // 6-8
                  "The Closer"        // 9-10
                ]}
                description="How aggressive to handle objections"
              />

              <LabeledSlider
                icon="❓"
                label="Qualification Priority"
                value={formData.qualificationPriority}
                onChange={(value) => updateFormData({ qualificationPriority: value })}
                min={0}
                max={10}
                step={1}
                valueFormatter={(v) => `${v}/10`}
                labels={[
                  "No Questions",         // 0-2
                  "Balanced",             // 3-5
                  "Priority Focus",       // 6-8
                  "Qualification First"   // 9-10
                ]}
                description="Priority of asking qualification questions"
              />

              <LabeledSlider
                icon="🎨"
                label="Creativity"
                value={formData.bot_temperature}
                onChange={(value) => updateFormData({ bot_temperature: value })}
                min={0}
                max={1}
                step={0.1}
                valueFormatter={(v) => v.toFixed(1)}
                labels={[
                  "Stick to the Script",  // 0-0.2
                  "Slightly Flexible",    // 0.3-0.4
                  "Balanced",             // 0.5-0.6
                  "Creative",             // 0.7-0.8
                  "Very Creative"         // 0.9-1.0
                ]}
                description="Lower = more consistent, Higher = more creative"
              />
            </div>
          </div>
        )}

        {/* TAB 2: CONVERSATION - PIXEL PERFECT */}
        {activeTab === 2 && (
          <div style={{ maxWidth: '900px' }}>
            {/* Initial Message */}
            <div className="ds-spacer-2xl">
              <div className="ds-section-header">
                <h2 style={{
                  fontSize: 'var(--font-xl)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--text-primary)',
                  margin: 0
                }}>
                  Initial Message
                </h2>
                <button className="ds-btn ds-btn-primary">
                  + Add Template
                </button>
              </div>
              <textarea
                className="ds-input ds-textarea"
                value={formData.initialMessage}
                onChange={(e) => updateFormData({ initialMessage: e.target.value })}
                placeholder="Hey! Thanks for reaching out..."
                rows={4}
              />
            </div>

            {/* Qualification Questions */}
            <div className="ds-spacer-2xl">
              <div className="ds-section-header">
                <h2 style={{
                  fontSize: 'var(--font-xl)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--text-primary)',
                  margin: 0
                }}>
                  Qualification Questions ({qualificationQuestions.length > 0 ? 'ON' : 'OFF'})
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <span style={{
                    fontSize: 'var(--font-sm)',
                    color: 'var(--text-tertiary)',
                    fontWeight: 'var(--font-weight-medium)'
                  }}>
                    Turn on qualifications
                  </span>
                  <label className="ds-toggle">
                    <input
                      type="checkbox"
                      checked={qualificationQuestions.length > 0}
                      onChange={() => {}}
                    />
                    <span className="ds-toggle-slider"></span>
                  </label>
                </div>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => handleDragEnd(event, qualificationQuestions, setQualificationQuestions)}
              >
                <SortableContext
                  items={qualificationQuestions.map(q => q.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {qualificationQuestions.map((q, index) => (
                    <QuestionCard
                      key={q.id}
                      id={q.id}
                      index={index + 1}
                      question={q.text}
                      onUpdate={updateQuestion}
                      onDelete={deleteQuestion}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {qualificationQuestions.length === 0 && (
                <p style={{
                  color: 'var(--text-tertiary)',
                  textAlign: 'center',
                  padding: '40px 0',
                  fontSize: 'var(--font-base)'
                }}>
                  No qualification questions yet. Click "Add Question" to get started.
                </p>
              )}

              <button className="ds-btn-add" onClick={addQuestion}>
                + Add Question
              </button>
            </div>

            {/* Follow-up Messages */}
            <div className="ds-spacer-2xl">
              <div className="ds-section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <h2 style={{
                    fontSize: 'var(--font-xl)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--text-primary)',
                    margin: 0
                  }}>
                    Follow Ups
                  </h2>
                  <span className="ds-section-count">{followUps.length}</span>
                </div>
                <button className="ds-btn ds-btn-secondary">
                  + Add Template
                </button>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => handleDragEnd(event, followUps, setFollowUps)}
              >
                <SortableContext
                  items={followUps.map(f => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {followUps.map((f, index) => (
                    <FollowUpCard
                      key={f.id}
                      id={f.id}
                      index={index + 1}
                      message={f.message}
                      delay={f.delay}
                      onUpdate={updateFollowUp}
                      onDelete={deleteFollowUp}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {followUps.length === 0 && (
                <p style={{
                  color: 'var(--text-tertiary)',
                  textAlign: 'center',
                  padding: '40px 0',
                  fontSize: 'var(--font-base)'
                }}>
                  No follow-ups configured. Add follow-ups to re-engage leads.
                </p>
              )}

              <button className="ds-btn-add" onClick={addFollowUp}>
                + Add Follow Up
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: CONFIGURATIONS - PIXEL PERFECT */}
        {activeTab === 3 && (
          <div style={{ maxWidth: '900px' }}>
            {/* Calendar Integration */}
            <div className="ds-spacer-2xl">
              <h2 style={{
                fontSize: 'var(--font-xl)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-primary)',
                marginBottom: 'var(--space-xl)'
              }}>
                Calendar Integration
              </h2>

              <ToggleSection
                icon="📅"
                title="Calendar Connection"
                description="Connect your calendar for automatic appointment scheduling"
                type="dropdown"
                value={formData.ghlCalendarId || "none"}
                onChange={(value) => updateFormData({ ghlCalendarId: value })}
                options={[
                  { value: "none", label: "No Calendar Connected" },
                  { value: "cal_1", label: "LeadSync Calendar" },
                  { value: "cal_2", label: "Sales Team Calendar" },
                  { value: "cal_3", label: "Main Business Calendar" }
                ]}
              />
            </div>

            {/* Booking Behavior */}
            <div className="ds-spacer-2xl">
              <h2 style={{
                fontSize: 'var(--font-xl)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-primary)',
                marginBottom: 'var(--space-xl)'
              }}>
                Booking Behavior
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                <ToggleSection
                  icon="🤖"
                  title="Automatic Booking Detection"
                  description="AI will automatically detect when leads are ready to book an appointment"
                  type="toggle"
                  value={false}
                  onChange={() => {}}
                />

                <ToggleSection
                  icon="✅"
                  title="Qualification First"
                  description="Only offer booking after all qualification questions are answered"
                  type="toggle"
                  value={true}
                  onChange={() => {}}
                />

                <ToggleSection
                  icon="🔗"
                  title="Include Link in CTA"
                  description="Automatically include the booking link in your call-to-action message"
                  type="toggle"
                  value={true}
                  onChange={() => {}}
                />
              </div>
            </div>

            {/* Call-to-Action Message */}
            <div className="ds-spacer-2xl">
              <h2 style={{
                fontSize: 'var(--font-xl)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-primary)',
                marginBottom: 'var(--space-xl)'
              }}>
                Custom CTA Message
              </h2>

              <textarea
                className="ds-input ds-textarea"
                value={formData.cta}
                onChange={(e) => updateFormData({ cta: e.target.value })}
                placeholder="Would you like to book a call to discuss?"
                rows={4}
              />

              <div style={{
                fontSize: 'var(--font-sm)',
                color: 'var(--text-tertiary)',
                marginTop: 'var(--space-md)'
              }}>
                Available variables: <code style={{
                  background: 'var(--bg-input)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontFamily: 'monospace'
                }}>{'{name}'}</code> <code style={{
                  background: 'var(--bg-input)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontFamily: 'monospace'
                }}>{'{calendar_link}'}</code>
              </div>
            </div>

            {/* Disqualification Criteria */}
            <div className="ds-spacer-2xl">
              <h2 style={{
                fontSize: 'var(--font-xl)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-primary)',
                marginBottom: 'var(--space-xl)'
              }}>
                Disqualification Criteria
              </h2>

              <ToggleSection
                icon="⚠️"
                title="Auto-Disqualify Based on Responses"
                description="Automatically end conversation if lead doesn't meet criteria"
                type="dropdown"
                value="disabled"
                onChange={() => {}}
                options={[
                  { value: "disabled", label: "Disabled" },
                  { value: "soft", label: "Soft Disqualification (Continue conversation)" },
                  { value: "hard", label: "Hard Disqualification (End conversation)" }
                ]}
              />
            </div>
          </div>
        )}

        {/* TAB 4: KNOWLEDGE - PIXEL PERFECT */}
        {activeTab === 4 && (
          <div style={{ maxWidth: '900px' }}>
            {/* FAQs Section */}
            <div className="ds-spacer-2xl">
              <div className="ds-section-header">
                <h2 style={{
                  fontSize: 'var(--font-xl)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--text-primary)',
                  margin: 0
                }}>
                  Frequently Asked Questions
                </h2>
                <button className="ds-btn ds-btn-primary" onClick={addFAQ}>
                  + Add FAQ
                </button>
              </div>

              {/* Search Bar */}
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '1.1rem',
                    color: 'var(--text-tertiary)',
                    pointerEvents: 'none'
                  }}>
                    🔍
                  </div>
                  <input
                    type="text"
                    className="ds-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search FAQs..."
                    style={{ paddingLeft: '40px', paddingRight: searchTerm ? '40px' : '12px' }}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        padding: '4px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* FAQ List */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => handleDragEnd(event, faqs, setFaqs)}
              >
                <SortableContext
                  items={faqs.map(faq => faq.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {faqs
                    .filter(faq =>
                      searchTerm === '' ||
                      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map(faq => (
                      <FAQCard
                        key={faq.id}
                        id={faq.id}
                        question={faq.question}
                        answer={faq.answer}
                        delay={faq.delay}
                        onUpdate={updateFAQ}
                        onDelete={deleteFAQ}
                      />
                    ))}
                </SortableContext>
              </DndContext>

              {faqs.length === 0 && (
                <p style={{
                  color: 'var(--text-tertiary)',
                  textAlign: 'center',
                  padding: '40px 0',
                  fontSize: 'var(--font-base)'
                }}>
                  No FAQs yet. Click "Add FAQ" to create your first one.
                </p>
              )}
            </div>

            {/* Company Information */}
            <div className="ds-spacer-2xl">
              <h2 style={{
                fontSize: 'var(--font-xl)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-primary)',
                marginBottom: 'var(--space-xl)'
              }}>
                Company Information
              </h2>

              <textarea
                className="ds-input ds-textarea"
                value={formData.companyInformation}
                onChange={(e) => updateFormData({ companyInformation: e.target.value })}
                placeholder="Enter your company information, key details, mission, values, etc..."
                rows={6}
              />
            </div>

            {/* Knowledge Base */}
            <div className="ds-spacer-2xl">
              <h2 style={{
                fontSize: 'var(--font-xl)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-primary)',
                marginBottom: 'var(--space-xl)'
              }}>
                Knowledge Base
              </h2>

              <div className="ds-card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-lg)' }}>📚</div>
                <div style={{
                  fontSize: 'var(--font-md)',
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-sm)'
                }}>
                  Upload Documents & URLs
                </div>
                <div style={{
                  fontSize: 'var(--font-sm)',
                  color: 'var(--text-tertiary)',
                  marginBottom: 'var(--space-xl)',
                  lineHeight: 1.5
                }}>
                  Train your AI with documents, PDFs, and website URLs to provide more accurate and detailed responses
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
                  <button className="ds-btn ds-btn-secondary" disabled>
                    📄 Upload Document
                  </button>
                  <button className="ds-btn ds-btn-secondary" disabled>
                    🔗 Add URL
                  </button>
                </div>
                <div style={{
                  fontSize: 'var(--font-xs)',
                  color: 'var(--text-muted)',
                  marginTop: 'var(--space-lg)'
                }}>
                  Coming soon
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: TASKS - PIXEL PERFECT */}
        {activeTab === 5 && (
          <div style={{ maxWidth: '900px' }}>
            {/* Header */}
            <div className="ds-section-header" style={{ marginBottom: 'var(--space-2xl)' }}>
              <h2 style={{
                fontSize: 'var(--font-xl)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-primary)',
                margin: 0
              }}>
                AI Tasks
              </h2>
              <button className="ds-btn ds-btn-primary">
                + Add New Task
              </button>
            </div>

            {/* DEFAULT AI TASKS Section */}
            <div className="ds-spacer-2xl">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)',
                marginBottom: 'var(--space-xl)'
              }}>
                <h3 style={{
                  fontSize: 'var(--font-md)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--text-secondary)',
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  DEFAULT AI TASKS
                </h3>
                <span className="ds-section-count">5</span>
              </div>

              {/* Task List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                <TaskCard
                  icon="🎯"
                  title="Lead Qualification"
                  description="Automatically qualify leads based on conversation data and predefined criteria"
                  badges={[
                    { text: '3 WORKFLOWS', variant: 'default' },
                    { text: '5 STEPS', variant: 'default' }
                  ]}
                />

                <TaskCard
                  icon="📅"
                  title="Appointment Scheduling"
                  description="Schedule appointments with qualified leads using calendar integration"
                  badges={[
                    { text: '2 WORKFLOWS', variant: 'default' },
                    { text: '4 STEPS', variant: 'default' }
                  ]}
                />

                <TaskCard
                  icon="📧"
                  title="Follow-up Automation"
                  description="Send automated follow-up messages to leads who haven't responded"
                  badges={[
                    { text: '1 WORKFLOW', variant: 'default' },
                    { text: '3 STEPS', variant: 'default' }
                  ]}
                />

                <TaskCard
                  icon="📊"
                  title="Lead Scoring"
                  description="Automatically score leads based on engagement and qualification responses"
                  badges={[
                    { text: '2 WORKFLOWS', variant: 'default' },
                    { text: '6 STEPS', variant: 'default' }
                  ]}
                />

                <TaskCard
                  icon="🔔"
                  title="Notification Triggers"
                  description="Send notifications to team members when specific events occur"
                  badges={[
                    { text: '4 WORKFLOWS', variant: 'default' },
                    { text: '2 STEPS', variant: 'default' }
                  ]}
                />
              </div>
            </div>

            {/* CUSTOM TASKS Section */}
            <div className="ds-spacer-2xl">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)',
                marginBottom: 'var(--space-xl)'
              }}>
                <h3 style={{
                  fontSize: 'var(--font-md)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--text-secondary)',
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  CUSTOM TASKS
                </h3>
                <span className="ds-section-count">0</span>
              </div>

              <p style={{
                color: 'var(--text-tertiary)',
                textAlign: 'center',
                padding: '40px 0',
                fontSize: 'var(--font-base)'
              }}>
                No custom tasks yet. Click "Add New Task" to create your first custom automation.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StrategyEditorNew;
