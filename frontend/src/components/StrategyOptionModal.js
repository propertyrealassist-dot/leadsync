import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './StrategyOptionModal.css';

function StrategyOptionModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState('copilot');

  if (!isOpen) return null;

  const handleContinue = () => {
    onClose();

    switch (selectedOption) {
      case 'copilot':
        navigate('/copilot');
        break;
      case 'scratch':
        navigate('/ai-agents/new');
        break;
      case 'import':
        // Trigger import file dialog
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            // Read and import the strategy
            const reader = new FileReader();
            reader.onload = (event) => {
              try {
                const strategyData = JSON.parse(event.target.result);
                // Navigate to strategy editor with imported data
                navigate('/ai-agents/new', { state: { importedStrategy: strategyData } });
              } catch (error) {
                alert('Invalid strategy file. Please upload a valid JSON file.');
              }
            };
            reader.readAsText(file);
          }
        };
        fileInput.click();
        break;
      default:
        break;
    }
  };

  return (
    <div className="strategy-modal-overlay" onClick={onClose}>
      <div className="strategy-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="strategy-modal-close" onClick={onClose}>
          ✕
        </button>

        <div className="strategy-modal-header">
          <div className="strategy-modal-icon">
            🤖
          </div>
          <h2>Choose a Strategy Option</h2>
          <p>Start from scratch, use a pre-built template or upload an existing strategy—your choice</p>
        </div>

        <div className="strategy-modal-body">
          <div className="strategy-options">
            <label className={`strategy-option ${selectedOption === 'copilot' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="strategy"
                value="copilot"
                checked={selectedOption === 'copilot'}
                onChange={(e) => setSelectedOption(e.target.value)}
              />
              <div className="strategy-option-content">
                <div className="strategy-option-icon">✨</div>
                <div className="strategy-option-details">
                  <h3>Use Co-Pilot</h3>
                  <p>Let AI scan a website and generate a complete strategy for you</p>
                </div>
              </div>
              <div className="strategy-option-check">
                {selectedOption === 'copilot' && '✓'}
              </div>
            </label>

            <label className={`strategy-option ${selectedOption === 'scratch' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="strategy"
                value="scratch"
                checked={selectedOption === 'scratch'}
                onChange={(e) => setSelectedOption(e.target.value)}
              />
              <div className="strategy-option-content">
                <div className="strategy-option-icon">📝</div>
                <div className="strategy-option-details">
                  <h3>Create from Scratch</h3>
                  <p>Build your own custom strategy with full control</p>
                </div>
              </div>
              <div className="strategy-option-check">
                {selectedOption === 'scratch' && '✓'}
              </div>
            </label>

            <label className={`strategy-option ${selectedOption === 'import' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="strategy"
                value="import"
                checked={selectedOption === 'import'}
                onChange={(e) => setSelectedOption(e.target.value)}
              />
              <div className="strategy-option-content">
                <div className="strategy-option-icon">📥</div>
                <div className="strategy-option-details">
                  <h3>Import Strategy</h3>
                  <p>Upload an existing strategy file (.json)</p>
                </div>
              </div>
              <div className="strategy-option-check">
                {selectedOption === 'import' && '✓'}
              </div>
            </label>
          </div>
        </div>

        <div className="strategy-modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleContinue}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export default StrategyOptionModal;
