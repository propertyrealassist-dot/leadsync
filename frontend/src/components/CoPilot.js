import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CoPilot.css';

function CoPilot() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  return (
    <div className="copilot-container">
      <div className="page-header">
        <div>
          <h1>🤖 AI Strategy Co-Pilot</h1>
          <p className="page-subtitle">Build intelligent conversation strategies with guided assistance</p>
        </div>
      </div>

      {/* Coming Soon Banner */}
      <div className="coming-soon-banner">
        <div className="banner-content">
          <div className="banner-icon">🚀</div>
          <h2>Coming Soon!</h2>
          <p>
            The AI Strategy Co-Pilot is currently under development. This powerful feature will guide you through
            creating sophisticated AI conversation strategies with:
          </p>
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon">✨</div>
              <h3>Smart Suggestions</h3>
              <p>AI-powered recommendations for your use case</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🎯</div>
              <h3>Industry Templates</h3>
              <p>Pre-built strategies for various industries</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🔄</div>
              <h3>Step-by-Step Wizard</h3>
              <p>Guided process to build complete strategies</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">💡</div>
              <h3>Best Practices</h3>
              <p>Built-in tips and optimization suggestions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h2>In the meantime, you can:</h2>
        <div className="actions-grid">
          <div className="action-card" onClick={() => navigate('/strategy/new')}>
            <div className="action-icon">✏️</div>
            <h3>Create Strategy Manually</h3>
            <p>Build a custom AI strategy from scratch</p>
            <button className="btn-action">Get Started →</button>
          </div>
          <div className="action-card" onClick={() => navigate('/strategies')}>
            <div className="action-icon">📋</div>
            <h3>View Existing Strategies</h3>
            <p>Manage and edit your current AI agents</p>
            <button className="btn-action">View All →</button>
          </div>
          <div className="action-card" onClick={() => navigate('/test')}>
            <div className="action-icon">✨</div>
            <h3>Test AI Conversations</h3>
            <p>Try out your strategies in real-time</p>
            <button className="btn-action">Test Now →</button>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="preview-section">
        <h2>What to Expect</h2>
        <div className="preview-steps">
          <div className="preview-step">
            <div className="step-number">1</div>
            <h3>Describe Your Business</h3>
            <p>Tell us about your industry, goals, and target audience</p>
          </div>
          <div className="preview-step">
            <div className="step-number">2</div>
            <h3>Choose Strategy Type</h3>
            <p>Select from appointment booking, lead qualification, or custom workflows</p>
          </div>
          <div className="preview-step">
            <div className="step-number">3</div>
            <h3>Configure AI Behavior</h3>
            <p>Set tone, personality, and conversation rules with smart suggestions</p>
          </div>
          <div className="preview-step">
            <div className="step-number">4</div>
            <h3>Review & Launch</h3>
            <p>Preview your strategy and deploy to start automating conversations</p>
          </div>
        </div>
      </div>

      {/* Notification Section */}
      <div className="notification-section">
        <h2>Want to be notified when Co-Pilot launches?</h2>
        <p>We'll send you an email as soon as this feature is ready</p>
        <div className="notification-form">
          <button className="btn-primary-large" onClick={() => alert('Thank you! We\'ll notify you when Co-Pilot is ready.')}>
            Notify Me
          </button>
        </div>
      </div>
    </div>
  );
}

export default CoPilot;
