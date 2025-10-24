import React, { useState, useEffect } from 'react';
import './PromptBuilder.css';

function PromptBuilder({ isOpen, onClose, onSave, initialBrief }) {
  const [activeTab, setActiveTab] = useState('role');
  const [promptData, setPromptData] = useState({
    role: '',
    objective: '',
    context: '',
    rules: '',
    examples: []
  });

  useEffect(() => {
    if (initialBrief) {
      // Try to parse existing brief if editing
      setPromptData({
        ...promptData,
        role: initialBrief
      });
    }
  }, [initialBrief]);

  const addExample = (type) => {
    setPromptData({
      ...promptData,
      examples: [...promptData.examples, { type, content: '' }]
    });
  };

  const updateExample = (index, content) => {
    const newExamples = [...promptData.examples];
    newExamples[index].content = content;
    setPromptData({ ...promptData, examples: newExamples });
  };

  const removeExample = (index) => {
    const newExamples = promptData.examples.filter((_, i) => i !== index);
    setPromptData({ ...promptData, examples: newExamples });
  };

  const generatePrompt = () => {
    let prompt = '';

    if (promptData.role) {
      prompt += `ROLE:\n${promptData.role}\n\n`;
    }

    if (promptData.objective) {
      prompt += `OBJECTIVE:\n${promptData.objective}\n\n`;
    }

    if (promptData.context) {
      prompt += `CONTEXT:\n${promptData.context}\n\n`;
    }

    if (promptData.rules) {
      prompt += `RULES:\n${promptData.rules}\n\n`;
    }

    if (promptData.examples.length > 0) {
      prompt += `EXAMPLES:\n`;
      promptData.examples.forEach((ex, idx) => {
        prompt += `${ex.type === 'user' ? 'User' : 'AI'}: ${ex.content}\n`;
      });
    }

    return prompt.trim();
  };

  const handleSave = () => {
    const generatedPrompt = generatePrompt();
    onSave(generatedPrompt);
    onClose();
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'role', label: 'Role', icon: '👤' },
    { id: 'objective', label: 'Objective', icon: '🎯' },
    { id: 'context', label: 'Context', icon: '💎' },
    { id: 'rules', label: 'Rules', icon: '📋' },
    { id: 'examples', label: 'Examples', icon: '📚' }
  ];

  return (
    <div className="prompt-builder-overlay">
      <div className="prompt-builder-modal">
        <div className="prompt-builder-header">
          <div>
            <h2>📦 PromptBuilder+</h2>
            <p>Craft multi-section instruction briefs</p>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="prompt-builder-content">
          {/* Left Side - Preview */}
          <div className="prompt-preview">
            <h3>Live Preview</h3>
            <div className="preview-box">
              <pre>{generatePrompt() || 'Your generated prompt will appear here as you type...'}</pre>
            </div>
          </div>

          {/* Right Side - Builder */}
          <div className="prompt-form">
            {/* Tab Icons */}
            <div className="prompt-tabs">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`prompt-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.label}
                >
                  {tab.icon}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="prompt-tab-content">
              {activeTab === 'role' && (
                <div className="tab-panel">
                  <h3>👤 Role</h3>
                  <p className="tab-description">
                    Specify the company the AI works for and clearly define its role within it.
                  </p>
                  <textarea
                    value={promptData.role}
                    onChange={(e) => setPromptData({ ...promptData, role: e.target.value })}
                    placeholder="Specify the company the AI works for and clearly define its role within it."
                    rows={12}
                  />
                </div>
              )}

              {activeTab === 'objective' && (
                <div className="tab-panel">
                  <h3>🎯 Objective</h3>
                  <p className="tab-description">
                    State the #1 measurable goal, e.g. 'Booking an appointment'.
                  </p>
                  <textarea
                    value={promptData.objective}
                    onChange={(e) => setPromptData({ ...promptData, objective: e.target.value })}
                    placeholder="State the #1 measurable goal, e.g. 'Booking an appointment'."
                    rows={12}
                  />
                </div>
              )}

              {activeTab === 'context' && (
                <div className="tab-panel">
                  <h3>💎 Context</h3>
                  <p className="tab-description">
                    Give any context about the lead, like where they came from e.g a FB form, what they have been offered etc
                  </p>
                  <textarea
                    value={promptData.context}
                    onChange={(e) => setPromptData({ ...promptData, context: e.target.value })}
                    placeholder="Give any context about the lead, like where they came from e.g a FB form, what they have been offered etc"
                    rows={12}
                  />
                </div>
              )}

              {activeTab === 'rules' && (
                <div className="tab-panel">
                  <h3>📋 Rules</h3>
                  <p className="tab-description">
                    List strict do's and don'ts—include word limits, Language, banned phrases, and disqualification rules.
                  </p>
                  <textarea
                    value={promptData.rules}
                    onChange={(e) => setPromptData({ ...promptData, rules: e.target.value })}
                    placeholder="List strict do's and don'ts—include word limits, Language, banned phrases, and disqualification rules."
                    rows={12}
                  />
                </div>
              )}

              {activeTab === 'examples' && (
                <div className="tab-panel">
                  <h3>📚 Examples</h3>
                  <p className="tab-description">
                    Add a sample conversation using your intro and qualification questions so the AI can mirror your tone exactly.
                  </p>
                  
                  <div className="examples-list">
                    {promptData.examples.map((example, idx) => (
                      <div key={idx} className="example-item">
                        <div className="example-header">
                          <span className={`example-type ${example.type}`}>
                            {example.type === 'user' ? '👤 User' : '🤖 AI'}
                          </span>
                          <button
                            className="btn-remove"
                            onClick={() => removeExample(idx)}
                          >
                            ✕
                          </button>
                        </div>
                        <textarea
                          value={example.content}
                          onChange={(e) => updateExample(idx, e.target.value)}
                          placeholder={`${example.type === 'user' ? 'User' : 'AI'} message...`}
                          rows={3}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="example-buttons">
                    <button
                      className="btn btn-secondary"
                      onClick={() => addExample('user')}
                    >
                      + Add User Message
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => addExample('ai')}
                    >
                      + Add AI Message
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="prompt-builder-footer">
              <button className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                Save Prompt
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PromptBuilder;