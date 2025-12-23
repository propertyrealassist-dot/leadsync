import { useState } from 'react';
import '../styles/appointwise.css';

export default function EditStrategyNew() {
  const [activeTab, setActiveTab] = useState('instructions');
  const [qualificationEnabled, setQualificationEnabled] = useState(false);
  const [template, setTemplate] = useState({
    name: '',
    tag: '',
    tone: 'Friendly and Casual',
    brief: ''
  });

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-8">
      {/* Tab Navigation */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex gap-1 border-b border-white/10">
          {['instructions', 'conversation', 'booking', 'knowledge', 'tasks'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-[var(--accent-mint)] text-[var(--accent-mint)]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab}
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
                  <button className="btn btn-primary">
                    Build My Prompt
                  </button>
                </div>

                <textarea
                  value={template.brief || ''}
                  onChange={(e) => setTemplate({...template, brief: e.target.value})}
                  className="form-control font-mono"
                  style={{ minHeight: '500px', resize: 'vertical' }}
                  placeholder="Enter your AI prompt here..."
                />

                <div className="flex justify-between text-xs text-muted mt-2">
                  <span>Character Count: {template.brief?.length || 0}</span>
                  <span>Tokens: ~{Math.ceil((template.brief?.length || 0) / 4)}</span>
                </div>
              </div>

              {/* RIGHT COLUMN: Adjustments */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Adjustments</h3>

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
          <div className="space-y-8">
            {/* Initial Message Section */}
            <div className="bg-[#1a1f2e] border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">💬 Initial Message</h3>
                <button className="text-[#34d399] hover:text-[#10b981] text-sm font-medium">
                  + Add Template
                </button>
              </div>
              <textarea
                className="w-full h-24 bg-[#0a0e1a] border border-white/10 rounded-lg p-4 text-white resize-none focus:outline-none focus:border-[#34d399]/50"
                placeholder="Enter your initial message..."
              />
            </div>

            {/* Qualification Questions Section */}
            <div className="bg-[#1a1f2e] border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  ❓ Qualification Questions {qualificationEnabled ? '(ON)' : '(OFF)'}
                </h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm text-gray-400">Turn on qualifications</span>
                  <input
                    type="checkbox"
                    checked={qualificationEnabled}
                    onChange={(e) => setQualificationEnabled(e.target.checked)}
                    className="w-10 h-6 bg-gray-600 rounded-full appearance-none cursor-pointer relative
                      checked:bg-[#34d399] transition-colors
                      after:content-[''] after:absolute after:top-1 after:left-1
                      after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform
                      checked:after:translate-x-4"
                  />
                </label>
              </div>

              {!qualificationEnabled && (
                <p className="text-center text-gray-500 italic py-8">
                  Qualification disabled
                </p>
              )}

              {qualificationEnabled && (
                <div className="space-y-3">
                  {/* Example Question Card */}
                  <div className="flex items-start gap-3 p-4 bg-[#0a0e1a] rounded-lg">
                    <div className="text-gray-500 cursor-move">⋮⋮</div>
                    <div className="flex-1">
                      <div className="font-medium">Q1: What is your biggest challenge?</div>
                      <div className="text-sm text-gray-400 mt-1">Condition: None</div>
                    </div>
                    <button className="text-red-400 hover:text-red-300">×</button>
                  </div>
                </div>
              )}
            </div>

            {/* Follow Ups Section */}
            <div className="bg-[#1a1f2e] border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">📬 Follow Ups</h3>
                  <span className="px-2 py-1 text-xs font-semibold bg-white/10 rounded-full">1</span>
                </div>
                <button className="text-[#34d399] hover:text-[#10b981] text-sm font-medium">
                  + Add Template
                </button>
              </div>

              {/* Follow Up Card */}
              <div className="flex items-center gap-3 p-4 bg-[#0a0e1a] rounded-lg mb-3">
                <div className="text-gray-500 cursor-move">⋮⋮</div>
                <div className="font-bold text-gray-400">F1</div>
                <div className="flex-1 text-sm">
                  Vuoi iniziare il percorso insieme a me o preferisci che blocchi tutto?
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Delay:</span>
                  <input
                    type="text"
                    defaultValue="1d"
                    className="w-16 px-2 py-1 bg-[#1a1f2e] border border-white/10 rounded text-center text-sm"
                  />
                </div>
                <button className="text-red-400 hover:text-red-300">×</button>
              </div>

              {/* Add Follow Up Button */}
              <button className="w-full border-2 border-dashed border-white/20 rounded-lg py-4 text-[#34d399] hover:border-[#34d399]/50 hover:bg-[#34d399]/5 transition-colors">
                + Add Follow Up
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
