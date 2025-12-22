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
  QuestionCard,
  FollowUpCard,
  FAQCard,
  IntegrationCard
} from './strategy';

import '../styles/strategy.css';

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
        {/* TAB 1: INSTRUCTIONS */}
        {activeTab === 1 && (
          <div>
            <StrategySection
              title="Prompt Editor"
              icon="📝"
              actions={
                <button className="strategy-btn strategy-btn-secondary strategy-btn-sm">
                  Build with AI
                </button>
              }
            >
              <MonacoPromptEditor
                value={formData.brief}
                onChange={(value) => updateFormData({ brief: value })}
                placeholder="Enter your AI prompt instructions here..."
                height="400px"
              />
            </StrategySection>

            <StrategySection title="Adjustments" icon="🎛">
              <ModernSlider
                label="Initial Msg Delay"
                value={formData.messageDelayInitial}
                onChange={(value) => updateFormData({ messageDelayInitial: value })}
                min={0}
                max={30}
                step={0.5}
                formatValue={(v) => `${v}s`}
                description="Delay before sending the first message"
              />

              <ModernSlider
                label="Response Delay"
                value={formData.messageDelayStandard}
                onChange={(value) => updateFormData({ messageDelayStandard: value })}
                min={0}
                max={10}
                step={0.5}
                formatValue={(v) => `${v}s`}
                description="Delay before responding to messages"
              />

              <ModernSlider
                label="Objection Handling"
                value={formData.objectionHandling}
                onChange={(value) => updateFormData({ objectionHandling: value })}
                min={0}
                max={10}
                step={1}
                formatValue={(v) => `${v}/10`}
                description="How aggressive to handle objections"
              />

              <ModernSlider
                label="Qualification Priority"
                value={formData.qualificationPriority}
                onChange={(value) => updateFormData({ qualificationPriority: value })}
                min={0}
                max={10}
                step={1}
                formatValue={(v) => `${v}/10`}
                description="Priority of asking qualification questions"
              />

              <ModernSlider
                label="Creativity (Temperature)"
                value={formData.bot_temperature}
                onChange={(value) => updateFormData({ bot_temperature: value })}
                min={0}
                max={1}
                step={0.1}
                formatValue={(v) => v.toFixed(1)}
                description="Lower = more consistent, Higher = more creative"
              />
            </StrategySection>
          </div>
        )}

        {/* TAB 2: CONVERSATION */}
        {activeTab === 2 && (
          <div>
            <StrategySection title="💬 Initial Message" icon="💬">
              <StrategyInput
                label="Initial Message"
                value={formData.initialMessage}
                onChange={(e) => updateFormData({ initialMessage: e.target.value })}
                placeholder="Hey! Thanks for reaching out..."
                multiline
                rows={3}
                maxLength={500}
                showCharCount
              />
            </StrategySection>

            <StrategySection
              title="❓ Qualification Questions"
              icon="❓"
              actions={
                <button className="strategy-btn strategy-btn-primary strategy-btn-sm" onClick={addQuestion}>
                  + Add Question
                </button>
              }
            >
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
                <p style={{ color: 'var(--strategy-text-tertiary)', textAlign: 'center', padding: '40px 0' }}>
                  No qualification questions yet. Click "Add Question" to get started.
                </p>
              )}
            </StrategySection>

            <StrategySection
              title="📬 Follow-up Messages"
              icon="📬"
              actions={
                <button className="strategy-btn strategy-btn-primary strategy-btn-sm" onClick={addFollowUp}>
                  + Add Follow-up
                </button>
              }
            >
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
                <p style={{ color: 'var(--strategy-text-tertiary)', textAlign: 'center', padding: '40px 0' }}>
                  No follow-ups configured. Add follow-ups to re-engage leads.
                </p>
              )}
            </StrategySection>
          </div>
        )}

        {/* TAB 3: BOOKING */}
        {activeTab === 3 && (
          <div>
            <StrategySection title="📅 Calendar Integration" icon="📅">
              <StrategyCard>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📅</div>
                  <div style={{ fontSize: '0.9375rem', color: 'var(--strategy-text-primary)', marginBottom: '8px' }}>
                    Status: <span style={{ color: 'var(--strategy-success)' }}>Connected ✓</span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--strategy-text-secondary)', marginBottom: '16px' }}>
                    Calendar: LeadSync Cal
                  </div>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button className="strategy-btn strategy-btn-secondary strategy-btn-sm">
                      Change Calendar
                    </button>
                    <button className="strategy-btn strategy-btn-ghost strategy-btn-sm">
                      Disconnect
                    </button>
                  </div>
                </div>
              </StrategyCard>
            </StrategySection>

            <StrategySection title="🤖 Calendar Readiness Detection" icon="🤖">
              <StrategyToggle
                label="Enable automatic booking detection"
                checked={false}
                onChange={() => {}}
                description="AI will detect when leads are ready to book"
              />
              <StrategyToggle
                label="Only offer booking after qualification"
                checked={true}
                onChange={() => {}}
                description="Complete qualification questions before offering calendar"
              />
              <StrategyToggle
                label="Include calendar link in CTA"
                checked={true}
                onChange={() => {}}
                description="Automatically include booking link in call-to-action"
              />
            </StrategySection>

            <StrategySection title="📍 Call-to-Action Message" icon="📍">
              <StrategyInput
                label="CTA Message"
                value={formData.cta}
                onChange={(e) => updateFormData({ cta: e.target.value })}
                placeholder="Would you like to book a call to discuss?"
                multiline
                rows={3}
              />
              <div style={{ fontSize: '0.8125rem', color: 'var(--strategy-text-tertiary)', marginTop: '8px' }}>
                Available variables: {'{'}name{'}'} {'{'}calendar_link{'}'}
              </div>
            </StrategySection>
          </div>
        )}

        {/* TAB 4: KNOWLEDGE */}
        {activeTab === 4 && (
          <div>
            <StrategySection
              title="Frequently Asked Questions"
              icon="❓"
              actions={
                <button className="strategy-btn strategy-btn-primary strategy-btn-sm" onClick={addFAQ}>
                  + New FAQ
                </button>
              }
            >
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                onClear={() => setSearchTerm('')}
                placeholder="Search FAQs..."
              />

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
                <p style={{ color: 'var(--strategy-text-tertiary)', textAlign: 'center', padding: '40px 0' }}>
                  No FAQs yet. Click "New FAQ" to add one.
                </p>
              )}
            </StrategySection>

            <StrategySection title="📄 Company Information" icon="📄">
              <StrategyInput
                label="Company Info"
                value={formData.companyInformation}
                onChange={(e) => updateFormData({ companyInformation: e.target.value })}
                placeholder="Enter your company information..."
                multiline
                rows={5}
              />
            </StrategySection>

            <StrategySection title="📚 Knowledge Base (Coming Soon)" icon="📚">
              <StrategyCard>
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📚</div>
                  <div style={{ fontSize: '0.9375rem', color: 'var(--strategy-text-secondary)', marginBottom: '16px' }}>
                    Upload documents, PDFs, and website URLs to train your AI
                  </div>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button className="strategy-btn strategy-btn-secondary" disabled>
                      Upload Document
                    </button>
                    <button className="strategy-btn strategy-btn-secondary" disabled>
                      Add URL
                    </button>
                  </div>
                </div>
              </StrategyCard>
            </StrategySection>
          </div>
        )}

        {/* TAB 5: CUSTOM TASKS */}
        {activeTab === 5 && (
          <div>
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              onClear={() => setSearchTerm('')}
              placeholder="Search integrations..."
            />

            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {['All', 'CRM', 'Marketing', 'Email', 'Communication'].map(filter => (
                <button
                  key={filter}
                  className={`strategy-btn ${integrationFilter === filter ? 'strategy-btn-primary' : 'strategy-btn-ghost'} strategy-btn-sm`}
                  onClick={() => setIntegrationFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>

            <StrategySection title="📊 CRM & Sales" icon="📊">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                <IntegrationCard name="GHL" icon="📈" description="GoHighLevel CRM" connected category="CRM" />
                <IntegrationCard name="Pipedrive" icon="🎯" description="Sales CRM" category="CRM" />
                <IntegrationCard name="ActiveCampaign" icon="📧" description="Marketing automation" category="CRM" />
                <IntegrationCard name="Close" icon="📞" description="Sales CRM" category="CRM" />
              </div>
            </StrategySection>

            <StrategySection title="📢 Marketing & Communication" icon="📢">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                <IntegrationCard name="Mailchimp" icon="✉️" description="Email marketing" category="Marketing" />
                <IntegrationCard name="Intercom" icon="💬" description="Customer messaging" category="Marketing" />
                <IntegrationCard name="Twilio" icon="📱" description="SMS & Voice" category="Communication" />
              </div>
            </StrategySection>
          </div>
        )}
      </div>
    </div>
  );
}

export default StrategyEditorNew;
