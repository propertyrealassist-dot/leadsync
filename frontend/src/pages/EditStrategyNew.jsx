import { useState } from 'react';
import '../styles/appointwise.css';

export default function EditStrategyNew() {
  const [activeTab, setActiveTab] = useState('instructions');
  const [qualificationEnabled, setQualificationEnabled] = useState(false);
  const [template, setTemplate] = useState({
    name: '',
    tag: '',
    tone: 'Friendly and Casual',
    brief: '',
    initialMessage: '',
    calendarProvider: 'Google Calendar',
    calendarUrl: '',
    meetingDuration: { hours: 0, minutes: 30, seconds: 0 },
    bufferTime: { hours: 0, minutes: 15, seconds: 0 },
    confirmationMessage: '',
    companyName: '',
    industry: '',
    companyDescription: ''
  });
  const [qualificationQuestions, setQualificationQuestions] = useState([
    { id: 1, question: 'What is your biggest challenge?', condition: 'None' }
  ]);
  const [followUps, setFollowUps] = useState([
    { id: 1, text: 'Vuoi iniziare il percorso insieme a me o preferisci che blocchi tutto?', delay: '1d' }
  ]);
  const [faqs, setFaqs] = useState([
    { id: 1, question: 'What is your pricing?', answer: 'Our pricing starts at $99/month for the basic plan...' },
    { id: 2, question: 'How does it work?', answer: 'Our AI agents connect to your CRM and automatically qualify leads...' },
    { id: 3, question: 'Can I try it for free?', answer: 'Yes! We offer a 14-day free trial with full features...' }
  ]);

  // Button handlers
  const handleBuildPrompt = () => {
    console.log('Building AI prompt...');
    // TODO: Integrate with AI prompt builder
  };

  const addQualificationQuestion = () => {
    const newId = Math.max(...qualificationQuestions.map(q => q.id), 0) + 1;
    setQualificationQuestions([...qualificationQuestions, {
      id: newId,
      question: '',
      condition: 'None'
    }]);
  };

  const removeQualificationQuestion = (id) => {
    setQualificationQuestions(qualificationQuestions.filter(q => q.id !== id));
  };

  const addFollowUp = () => {
    const newId = Math.max(...followUps.map(f => f.id), 0) + 1;
    setFollowUps([...followUps, {
      id: newId,
      text: '',
      delay: '1d'
    }]);
  };

  const removeFollowUp = (id) => {
    setFollowUps(followUps.filter(f => f.id !== id));
  };

  const addFAQ = () => {
    const newId = Math.max(...faqs.map(f => f.id), 0) + 1;
    setFaqs([...faqs, {
      id: newId,
      question: '',
      answer: ''
    }]);
  };

  const removeFAQ = (id) => {
    setFaqs(faqs.filter(f => f.id !== id));
  };

  const connectCalendar = () => {
    console.log('Connecting calendar...', template.calendarProvider, template.calendarUrl);
    // TODO: Integrate calendar connection
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-8" style={{
      background: 'radial-gradient(circle at 50% 0%, rgba(127, 255, 212, 0.03) 0%, #0a0e1a 50%)'
    }}>
      {/* Tab Navigation - STUNNING */}
      <div className="max-w-6xl mx-auto mb-8">
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.5rem',
          background: 'linear-gradient(135deg, var(--tertiary-bg) 0%, var(--card-bg) 100%)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
        }}>
          {[
            { id: 'instructions', icon: '📝', label: 'Instructions' },
            { id: 'conversation', icon: '💬', label: 'Conversation' },
            { id: 'booking', icon: '📅', label: 'Booking' },
            { id: 'knowledge', icon: '📚', label: 'Knowledge' },
            { id: 'tasks', icon: '✅', label: 'Tasks' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                background: activeTab === tab.id
                  ? 'var(--gradient-mint)'
                  : 'transparent',
                color: activeTab === tab.id
                  ? 'var(--primary-bg)'
                  : 'var(--text-secondary)',
                boxShadow: activeTab === tab.id
                  ? '0 4px 12px rgba(127, 255, 212, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                  : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = 'rgba(127, 255, 212, 0.1)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <span style={{ fontSize: '1.125rem' }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">

        {/* TAB 1: INSTRUCTIONS */}
        {activeTab === 'instructions' && (
          <div className="space-y-6">
            {/* Top Row - 3 Inputs */}
            <div className="grid grid-cols-3 gap-4">
              <div className="form-group">
                <label className="form-label">Strategy Name</label>
                <input
                  type="text"
                  value={template.name}
                  onChange={(e) => setTemplate({...template, name: e.target.value})}
                  className="form-control"
                  placeholder="Enter strategy name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">GHL Tag</label>
                <input
                  type="text"
                  value={template.tag}
                  onChange={(e) => setTemplate({...template, tag: e.target.value})}
                  className="form-control"
                  placeholder="leadsync-ai"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tone</label>
                <select
                  value={template.tone}
                  onChange={(e) => setTemplate({...template, tone: e.target.value})}
                  className="form-control"
                >
                  <option>Friendly and Casual</option>
                  <option>Professional and Formal</option>
                </select>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-[65%_35%] gap-6">

              {/* LEFT COLUMN: Prompt Editor */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="form-label">Prompt Editor</label>
                  <button className="btn btn-primary" onClick={handleBuildPrompt}>
                    ✨ Build My Prompt
                  </button>
                </div>

                <textarea
                  value={template.brief || ''}
                  onChange={(e) => setTemplate({...template, brief: e.target.value})}
                  className="form-control font-mono"
                  style={{ minHeight: '450px', resize: 'vertical', fontSize: '0.8125rem', lineHeight: '1.5' }}
                  placeholder="Enter your AI prompt here..."
                />

                <div className="flex justify-between text-xs text-muted mt-2">
                  <span>Character Count: {template.brief?.length || 0}</span>
                  <span>Tokens: ~{Math.ceil((template.brief?.length || 0) / 4)}</span>
                </div>
              </div>

              {/* RIGHT COLUMN: Adjustments */}
              <div className="space-y-6">
                <h3 className="text-base font-semibold" style={{ marginBottom: '1rem' }}>Adjustments</h3>

                {/* Initial Message Delay */}
                <div>
                  <label className="form-label">Initial Msg Delay</label>
                  <div className="time-input-grid">
                    <div className="text-center">
                      <input
                        type="number"
                        min="0"
                        max="23"
                        defaultValue="00"
                        className="time-input"
                      />
                      <span className="time-input-label">hr</span>
                    </div>
                    <div className="text-center">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        defaultValue="00"
                        className="time-input"
                      />
                      <span className="time-input-label">min</span>
                    </div>
                    <div className="text-center">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        defaultValue="30"
                        className="time-input"
                      />
                      <span className="time-input-label">sec</span>
                    </div>
                  </div>
                </div>

                {/* Response Delay */}
                <div>
                  <label className="form-label">Response Delay</label>
                  <div className="time-input-grid">
                    <div className="text-center">
                      <input type="number" min="0" max="23" defaultValue="00" className="time-input" />
                      <span className="time-input-label">hr</span>
                    </div>
                    <div className="text-center">
                      <input type="number" min="0" max="59" defaultValue="00" className="time-input" />
                      <span className="time-input-label">min</span>
                    </div>
                    <div className="text-center">
                      <input type="number" min="0" max="59" defaultValue="05" className="time-input" />
                      <span className="time-input-label">sec</span>
                    </div>
                  </div>
                </div>

                {/* Objection Handling Slider */}
                <div className="adjustment-item">
                  <div className="adjustment-header">
                    <label className="adjustment-label">
                      🛡️ Objection Handling
                    </label>
                    <div className="adjustment-value">
                      <span className="text-muted">The Persuader</span>
                      <span className="adjustment-badge">8/10</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    defaultValue="8"
                    className="range-slider w-full"
                  />
                </div>

                {/* Qualification Priority Slider */}
                <div className="adjustment-item">
                  <div className="adjustment-header">
                    <label className="adjustment-label">
                      ❓ Qualification Priority
                    </label>
                    <div className="adjustment-value">
                      <span className="text-muted">Balanced</span>
                      <span className="adjustment-badge">6/10</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    defaultValue="6"
                    className="range-slider w-full"
                  />
                </div>

                {/* Creativity Slider */}
                <div className="adjustment-item">
                  <div className="adjustment-header">
                    <label className="adjustment-label">
                      🎨 Creativity
                    </label>
                    <div className="adjustment-value">
                      <span className="text-muted">Stick to the Script</span>
                      <span className="adjustment-badge">0.4</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    defaultValue="0.4"
                    className="range-slider w-full"
                  />
                </div>

              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONVERSATION */}
        {activeTab === 'conversation' && (
          <div className="space-y-6">
            {/* Initial Message Section */}
            <div style={{
              background: 'var(--gradient-overlay)',
              border: '1px solid rgba(127, 255, 212, 0.1)',
              borderRadius: '12px',
              padding: '1.5rem'
            }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>💬</span> Initial Message
                </h3>
                <button className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
                  + Add Template
                </button>
              </div>
              <textarea
                className="form-control"
                style={{ minHeight: '100px', resize: 'vertical', fontSize: '0.8125rem' }}
                placeholder="Enter your initial message..."
              />
            </div>

            {/* Qualification Questions Section */}
            <div style={{
              background: 'var(--gradient-overlay)',
              border: '1px solid rgba(127, 255, 212, 0.1)',
              borderRadius: '12px',
              padding: '1.5rem'
            }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>❓</span> Qualification Questions
                  <span className="adjustment-badge" style={{ marginLeft: '0.5rem' }}>
                    {qualificationEnabled ? 'ON' : 'OFF'}
                  </span>
                </h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Enable qualifications</span>
                  <input
                    type="checkbox"
                    checked={qualificationEnabled}
                    onChange={(e) => setQualificationEnabled(e.target.checked)}
                    style={{
                      width: '44px',
                      height: '24px',
                      backgroundColor: qualificationEnabled ? 'var(--accent-mint)' : 'var(--tertiary-bg)',
                      borderRadius: '24px',
                      border: '1px solid var(--border-color)',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      appearance: 'none',
                      outline: 'none'
                    }}
                    className="toggle-switch-input"
                  />
                </label>
              </div>

              {!qualificationEnabled && (
                <p style={{
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontStyle: 'italic',
                  padding: '2rem 0',
                  fontSize: '0.875rem'
                }}>
                  Qualification questions disabled
                </p>
              )}

              {qualificationEnabled && (
                <div className="space-y-3">
                  {/* Dynamic Question Cards */}
                  {qualificationQuestions.map((q, index) => (
                    <div key={q.id} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '1rem',
                      background: 'linear-gradient(135deg, var(--tertiary-bg) 0%, var(--card-bg) 100%)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(127, 255, 212, 0.3)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}>
                      <div style={{ color: 'var(--text-muted)', cursor: 'move', fontSize: '1rem' }}>⋮⋮</div>
                      <div style={{ flex: 1 }}>
                        <input
                          type="text"
                          className="form-control"
                          style={{ marginBottom: '0.5rem' }}
                          value={q.question}
                          onChange={(e) => {
                            const updated = [...qualificationQuestions];
                            updated[index].question = e.target.value;
                            setQualificationQuestions(updated);
                          }}
                          placeholder={`Q${index + 1}: Enter question...`}
                        />
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Condition: {q.condition}
                        </div>
                      </div>
                      <button
                        onClick={() => removeQualificationQuestion(q.id)}
                        style={{
                          color: 'var(--danger)',
                          background: 'transparent',
                          border: 'none',
                          fontSize: '1.25rem',
                          cursor: 'pointer',
                          padding: '0',
                          transition: 'transform 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addQualificationQuestion}
                    className="btn btn-secondary"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      fontSize: '0.8125rem',
                      marginTop: '0.75rem'
                    }}>
                    + Add Question
                  </button>
                </div>
              )}
            </div>

            {/* Follow Ups Section */}
            <div style={{
              background: 'var(--gradient-overlay)',
              border: '1px solid rgba(127, 255, 212, 0.1)',
              borderRadius: '12px',
              padding: '1.5rem'
            }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>📬</span> Follow Ups
                  </h3>
                  <span className="adjustment-badge">{followUps.length}</span>
                </div>
              </div>

              {/* Dynamic Follow Up Cards */}
              {followUps.map((f, index) => (
                <div key={f.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, var(--tertiary-bg) 0%, var(--card-bg) 100%)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  marginBottom: '0.75rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(127, 255, 212, 0.3)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}>
                  <div style={{ color: 'var(--text-muted)', cursor: 'move', fontSize: '1rem' }}>⋮⋮</div>
                  <div className="adjustment-badge" style={{ minWidth: '32px', textAlign: 'center' }}>F{index + 1}</div>
                  <input
                    type="text"
                    className="form-control"
                    style={{ flex: 1, fontSize: '0.8125rem' }}
                    value={f.text}
                    onChange={(e) => {
                      const updated = [...followUps];
                      updated[index].text = e.target.value;
                      setFollowUps(updated);
                    }}
                    placeholder="Enter follow-up message..."
                  />
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Delay:</span>
                    <input
                      type="text"
                      value={f.delay}
                      onChange={(e) => {
                        const updated = [...followUps];
                        updated[index].delay = e.target.value;
                        setFollowUps(updated);
                      }}
                      className="time-input"
                      style={{ width: '60px' }}
                    />
                  </div>
                  <button
                    onClick={() => removeFollowUp(f.id)}
                    style={{
                      color: 'var(--danger)',
                      background: 'transparent',
                      border: 'none',
                      fontSize: '1.25rem',
                      cursor: 'pointer',
                      padding: '0',
                      transition: 'transform 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                    ×
                  </button>
                </div>
              ))}

              {/* Add Follow Up Button */}
              <button
                onClick={addFollowUp}
                style={{
                  width: '100%',
                  border: '2px dashed rgba(127, 255, 212, 0.2)',
                  borderRadius: '10px',
                  padding: '1rem',
                  background: 'transparent',
                  color: 'var(--accent-mint)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(127, 255, 212, 0.5)';
                  e.currentTarget.style.background = 'rgba(127, 255, 212, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(127, 255, 212, 0.2)';
                  e.currentTarget.style.background = 'transparent';
                }}>
                + Add Follow Up
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: BOOKING */}
        {activeTab === 'booking' && (
          <div className="space-y-6">
            {/* Calendar Integration */}
            <div style={{
              background: 'var(--gradient-overlay)',
              border: '1px solid rgba(127, 255, 212, 0.1)',
              borderRadius: '12px',
              padding: '1.5rem'
            }}>
              <h3 className="text-base font-semibold mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>📅</span> Calendar Integration
              </h3>

              <div className="form-group mb-4">
                <label className="form-label">Calendar Provider</label>
                <select
                  className="form-control"
                  value={template.calendarProvider}
                  onChange={(e) => setTemplate({...template, calendarProvider: e.target.value})}
                >
                  <option>Google Calendar</option>
                  <option>Outlook Calendar</option>
                  <option>Apple Calendar</option>
                  <option>Custom CalDAV</option>
                </select>
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Calendar URL</label>
                <input
                  type="text"
                  className="form-control"
                  value={template.calendarUrl}
                  onChange={(e) => setTemplate({...template, calendarUrl: e.target.value})}
                  placeholder="https://calendar.google.com/..."
                />
              </div>

              <button className="btn btn-primary" onClick={connectCalendar}>
                🔗 Connect Calendar
              </button>
            </div>

            {/* Booking Settings */}
            <div style={{
              background: 'var(--gradient-overlay)',
              border: '1px solid rgba(127, 255, 212, 0.1)',
              borderRadius: '12px',
              padding: '1.5rem'
            }}>
              <h3 className="text-base font-semibold mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>⚙️</span> Booking Settings
              </h3>

              <div className="form-group mb-4">
                <label className="form-label">Meeting Duration</label>
                <div className="time-input-grid">
                  <div className="text-center">
                    <input type="number" min="0" max="5" defaultValue="0" className="time-input" />
                    <span className="time-input-label">hr</span>
                  </div>
                  <div className="text-center">
                    <input type="number" min="0" max="59" defaultValue="30" className="time-input" />
                    <span className="time-input-label">min</span>
                  </div>
                  <div className="text-center">
                    <input type="number" min="0" max="59" defaultValue="00" className="time-input" />
                    <span className="time-input-label">sec</span>
                  </div>
                </div>
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Buffer Time (Between Meetings)</label>
                <div className="time-input-grid">
                  <div className="text-center">
                    <input type="number" min="0" max="2" defaultValue="0" className="time-input" />
                    <span className="time-input-label">hr</span>
                  </div>
                  <div className="text-center">
                    <input type="number" min="0" max="59" defaultValue="15" className="time-input" />
                    <span className="time-input-label">min</span>
                  </div>
                  <div className="text-center">
                    <input type="number" min="0" max="59" defaultValue="00" className="time-input" />
                    <span className="time-input-label">sec</span>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirmation Message</label>
                <textarea
                  className="form-control"
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  placeholder="Your meeting has been scheduled! Looking forward to speaking with you..."
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: KNOWLEDGE */}
        {activeTab === 'knowledge' && (
          <div className="space-y-6">
            {/* Company Information */}
            <div style={{
              background: 'var(--gradient-overlay)',
              border: '1px solid rgba(127, 255, 212, 0.1)',
              borderRadius: '12px',
              padding: '1.5rem'
            }}>
              <h3 className="text-base font-semibold mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🏢</span> Company Information
              </h3>

              <div className="form-group mb-4">
                <label className="form-label">Company Name</label>
                <input type="text" className="form-control" placeholder="LeadSync AI" />
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Industry</label>
                <input type="text" className="form-control" placeholder="AI-Powered Sales Automation" />
              </div>

              <div className="form-group">
                <label className="form-label">Company Description</label>
                <textarea
                  className="form-control"
                  style={{ minHeight: '120px', resize: 'vertical' }}
                  placeholder="We help businesses automate their lead generation and qualification process..."
                />
              </div>
            </div>

            {/* FAQs */}
            <div style={{
              background: 'var(--gradient-overlay)',
              border: '1px solid rgba(127, 255, 212, 0.1)',
              borderRadius: '12px',
              padding: '1.5rem'
            }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>❓</span> FAQs
                  <span className="adjustment-badge">{faqs.length}</span>
                </h3>
                <button className="btn btn-secondary" style={{ fontSize: '0.8125rem' }} onClick={addFAQ}>
                  + Add FAQ
                </button>
              </div>

              {/* Dynamic FAQ Items */}
              {faqs.map((faq, index) => (
                <div key={faq.id} style={{
                  padding: '1rem',
                  background: 'linear-gradient(135deg, var(--tertiary-bg) 0%, var(--card-bg) 100%)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  marginBottom: '0.75rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(127, 255, 212, 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}>
                  <div className="form-group mb-3">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Question</label>
                    <input
                      type="text"
                      className="form-control"
                      value={faq.question}
                      onChange={(e) => {
                        const updated = [...faqs];
                        updated[index].question = e.target.value;
                        setFaqs(updated);
                      }}
                      placeholder="Enter FAQ question..."
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Answer</label>
                    <textarea
                      className="form-control"
                      style={{ minHeight: '80px', resize: 'vertical' }}
                      value={faq.answer}
                      onChange={(e) => {
                        const updated = [...faqs];
                        updated[index].answer = e.target.value;
                        setFaqs(updated);
                      }}
                      placeholder="Enter FAQ answer..."
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                    <button
                      onClick={() => removeFAQ(faq.id)}
                      style={{
                        color: 'var(--danger)',
                        background: 'transparent',
                        border: 'none',
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                        fontWeight: 600,
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                      🗑️ Remove FAQ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: TASKS */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            {/* Task Workflows */}
            <div style={{
              background: 'var(--gradient-overlay)',
              border: '1px solid rgba(127, 255, 212, 0.1)',
              borderRadius: '12px',
              padding: '1.5rem'
            }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>✅</span> Task Workflows
                  <span className="adjustment-badge">4</span>
                </h3>
                <button className="btn btn-primary" style={{ fontSize: '0.8125rem' }}>
                  + Add Task
                </button>
              </div>

              {/* Task Cards */}
              {[
                { icon: '📧', title: 'Send Welcome Email', description: 'Triggered when lead is qualified' },
                { icon: '🔔', title: 'Notify Sales Team', description: 'Alert team members via Slack' },
                { icon: '📊', title: 'Update CRM', description: 'Sync lead data to Salesforce' },
                { icon: '📝', title: 'Create Follow-up Task', description: 'Schedule follow-up in 3 days' }
              ].map((task, i) => (
                <div key={i} style={{
                  display: 'flex',
                  gap: '1rem',
                  padding: '1.25rem',
                  background: 'linear-gradient(135deg, var(--tertiary-bg) 0%, var(--card-bg) 100%)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  marginBottom: '0.75rem',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(127, 255, 212, 0.3)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '10px',
                    background: 'var(--gradient-overlay)',
                    border: '1px solid rgba(127, 255, 212, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    flexShrink: 0
                  }}>
                    {task.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>
                      {task.title}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {task.description}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                      <span className="adjustment-badge" style={{ fontSize: '0.625rem' }}>Active</span>
                      <span style={{
                        padding: '0.1875rem 0.4375rem',
                        borderRadius: '6px',
                        fontSize: '0.625rem',
                        fontWeight: 600,
                        background: 'rgba(66, 153, 225, 0.2)',
                        color: 'var(--info)',
                        border: '1px solid rgba(66, 153, 225, 0.3)'
                      }}>
                        Step {i + 1}
                      </span>
                    </div>
                  </div>
                  <button style={{
                    color: 'var(--text-muted)',
                    background: 'transparent',
                    border: 'none',
                    fontSize: '1.25rem',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--text-primary)';
                    e.currentTarget.style.transform = 'rotate(90deg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-muted)';
                    e.currentTarget.style.transform = 'rotate(0deg)';
                  }}>
                    ⚙️
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
