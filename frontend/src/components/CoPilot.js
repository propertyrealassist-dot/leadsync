import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Icons from './Icons';
import './CoPilot.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function CoPilot() {
  const navigate = useNavigate();
  const [step, setStep] = useState('initial');
  const [data, setData] = useState({
    businessName: '',
    website: '',
    services: '',
    goal: '',
    postBooking: ''
  });
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  // Generate strategy
  const generateStrategy = async () => {
    setGenerating(true);
    setStep('generating');

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => {
            createActualStrategy();
          }, 500);
          return 100;
        }
        return p + 2;
      });
    }, 100);
  };

  const createActualStrategy = async () => {
    try {
      const token = localStorage.getItem('token');

      const strategyData = {
        name: `${data.businessName} AI Agent`,
        tag: data.businessName.toLowerCase().replace(/\s+/g, '-') + '-ai',
        tone: 'Friendly and Professional',
        brief: generateBrief(),
        objective: data.goal === 'aiBooks' ? 'Book appointments automatically' :
                   data.goal === 'sendLink' ? 'Share booking links' : 'Custom conversion goal',
        companyInformation: data.services || `${data.businessName} - ${data.website}`,
        initialMessage: `Hey! Thanks for reaching out to ${data.businessName}. Can you confirm this is {{contact.first_name}}?`,
        cta: data.goal === 'sendLink' ? 'Here\'s our booking link to schedule your appointment!' : '',
        turnOffAiAfterCta: data.postBooking === 'turnOffAI',
        turnOffFollowUps: data.postBooking === 'turnOffFollowUps',
        faqs: generateFAQs(),
        qualificationQuestions: generateQuestions(),
        followUps: generateFollowUps()
      };

      const response = await axios.post(`${API_URL}/api/templates`, strategyData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStep('complete');
      setTimeout(() => {
        navigate('/strategies');
      }, 3000);

    } catch (error) {
      console.error('Error creating strategy:', error);
      alert('Failed to create strategy. Please try again.');
      setStep('initial');
      setProgress(0);
    }
  };

  const generateBrief = () => {
    return `**${data.businessName.toUpperCase()} AI AGENT**\n\nYou are the AI assistant for ${data.businessName}. Your goal is to engage leads, qualify them, and ${data.goal === 'aiBooks' ? 'book appointments automatically' : data.goal === 'sendLink' ? 'share booking links' : 'achieve conversion goals'}.\n\nBe friendly, professional, and helpful. Ask qualifying questions naturally in conversation. ${data.postBooking === 'turnOffAI' ? 'After booking, turn off AI completely.' : 'After booking, turn off follow-ups but remain responsive.'}\n\nAlways maintain a conversational tone.`;
  };

  const generateFAQs = () => {
    return [
      { question: `What does ${data.businessName} do?`, answer: data.services || 'We provide excellent services.', delay: 1 },
      { question: 'How much does it cost?', answer: 'Pricing is customized to your needs.', delay: 1 }
    ];
  };

  const generateQuestions = () => {
    return [
      { text: 'What services are you interested in?', conditions: [], delay: 1 },
      { text: 'When are you looking to get started?', conditions: [], delay: 1 }
    ];
  };

  const generateFollowUps = () => {
    return [
      { text: 'Just checking in - still interested?', delay: 180 },
      { text: 'We have availability this week!', delay: 1440 }
    ];
  };

  // INITIAL VIEW
  if (step === 'initial') {
    return (
      <div className="copilot-container">
        <div className="copilot-header">
          <Icons.CoPilot size={64} color="#8B5CF6" />
          <h1>AI Strategy Co-Pilot</h1>
          <p>Build intelligent conversation strategies with guided assistance</p>
        </div>

        <div className="copilot-start">
          <h2>Let's create your AI agent!</h2>
          <p>I'll guide you through building a custom AI strategy for your business.</p>

          <button
            onClick={() => setStep('business')}
            className="btn-start"
          >
            <Icons.ArrowRight size={20} />
            Get Started
          </button>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <Icons.TrendingUp size={40} color="#8B5CF6" />
            <h3>Smart Suggestions</h3>
            <p>AI-powered recommendations for your strategy</p>
          </div>
          <div className="feature-card">
            <Icons.Target size={40} color="#EC4899" />
            <h3>Industry Templates</h3>
            <p>Pre-built strategies for various industries</p>
          </div>
          <div className="feature-card">
            <Icons.Settings size={40} color="#10b981" />
            <h3>Step-by-Step Wizard</h3>
            <p>Guided process to build complete strategies</p>
          </div>
        </div>
      </div>
    );
  }

  // BUSINESS NAME
  if (step === 'business') {
    return (
      <div className="copilot-container">
        <div className="copilot-progress">
          <div className="progress-bar" style={{ width: '20%' }}></div>
        </div>

        <h2>What's your business name?</h2>
        <p>I'll create a custom AI strategy tailored for your business</p>

        <div className="form-group">
          <input
            type="text"
            placeholder="Enter your business name"
            value={data.businessName}
            onChange={(e) => setData({ ...data, businessName: e.target.value })}
            className="input-large"
            autoFocus
          />
        </div>

        <div className="button-group">
          <button onClick={() => setStep('initial')} className="btn-secondary">
            <Icons.ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} />
            Back
          </button>
          <button
            onClick={() => setStep('website')}
            disabled={!data.businessName}
            className="btn-primary"
          >
            Continue
            <Icons.ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // WEBSITE
  if (step === 'website') {
    return (
      <div className="copilot-container">
        <div className="copilot-progress">
          <div className="progress-bar" style={{ width: '40%' }}></div>
        </div>

        <h2>Great! "{data.businessName}" - I like it!</h2>
        <h3>Do you have a website?</h3>
        <p>I can analyze your website to better understand your business</p>

        <div className="form-group">
          <input
            type="url"
            placeholder="www.example.com"
            value={data.website}
            onChange={(e) => setData({ ...data, website: e.target.value })}
            className="input-large"
          />
        </div>

        <div className="button-group">
          <button onClick={() => setStep('business')} className="btn-secondary">
            <Icons.ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} />
            Back
          </button>
          <button onClick={() => setStep('services')} className="btn-secondary">
            Skip
          </button>
          <button
            onClick={() => setStep('services')}
            disabled={!data.website}
            className="btn-primary"
          >
            Continue
            <Icons.ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // SERVICES
  if (step === 'services') {
    return (
      <div className="copilot-container">
        <div className="copilot-progress">
          <div className="progress-bar" style={{ width: '50%' }}></div>
        </div>

        <h2>Tell me about your services</h2>
        <p>What problems do you solve? What makes you different?</p>

        <textarea
          placeholder="Describe your services in detail..."
          value={data.services}
          onChange={(e) => setData({ ...data, services: e.target.value })}
          rows={8}
          className="textarea-large"
        />

        <div className="button-group">
          <button onClick={() => setStep('website')} className="btn-secondary">
            <Icons.ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} />
            Back
          </button>
          <button
            onClick={() => setStep('goal')}
            disabled={!data.services || data.services.length < 20}
            className="btn-primary"
          >
            Continue
            <Icons.ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // GOAL SELECTION
  if (step === 'goal') {
    return (
      <div className="copilot-container">
        <div className="copilot-progress">
          <div className="progress-bar" style={{ width: '70%' }}></div>
        </div>

        <h2>What's your main goal?</h2>
        <p>Choose how your AI should handle conversions</p>

        <div className="goal-cards">
          <div
            className="goal-card"
            onClick={() => {
              setData({ ...data, goal: 'aiBooks' });
              setStep('postBooking');
            }}
          >
            <Icons.Calendar size={48} color="#8B5CF6" />
            <h3>AI Books Appointments</h3>
            <p>Fully automated booking to your calendar</p>
          </div>

          <div
            className="goal-card"
            onClick={() => {
              setData({ ...data, goal: 'sendLink' });
              setStep('postBooking');
            }}
          >
            <Icons.Send size={48} color="#EC4899" />
            <h3>Send Booking Links</h3>
            <p>AI shares your calendar link</p>
          </div>

          <div
            className="goal-card"
            onClick={() => {
              setData({ ...data, goal: 'custom' });
              setStep('postBooking');
            }}
          >
            <Icons.Target size={48} color="#10b981" />
            <h3>Custom Goal</h3>
            <p>Define your own objective</p>
          </div>
        </div>

        <button onClick={() => setStep('services')} className="btn-back">
          <Icons.ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} />
          Back
        </button>
      </div>
    );
  }

  // POST-BOOKING
  if (step === 'postBooking') {
    return (
      <div className="copilot-container">
        <div className="copilot-progress">
          <div className="progress-bar" style={{ width: '90%' }}></div>
        </div>

        <h2>Post-Booking Behavior</h2>
        <p>How should the AI behave after booking?</p>

        <div className="behavior-cards">
          <div
            className="behavior-card"
            onClick={() => {
              setData({ ...data, postBooking: 'turnOffAI' });
              generateStrategy();
            }}
          >
            <Icons.X size={48} color="#ef4444" />
            <h3>Turn OFF AI Completely</h3>
            <ul>
              <li>No automated messages</li>
              <li>Manual takeover only</li>
            </ul>
          </div>

          <div
            className="behavior-card recommended"
            onClick={() => {
              setData({ ...data, postBooking: 'turnOffFollowUps' });
              generateStrategy();
            }}
          >
            <span className="badge-recommended">Recommended</span>
            <Icons.Check size={48} color="#10b981" />
            <h3>Turn OFF Follow-ups Only</h3>
            <ul>
              <li>Responds to messages</li>
              <li>No proactive outreach</li>
            </ul>
          </div>
        </div>

        <button onClick={() => setStep('goal')} className="btn-back">
          <Icons.ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} />
          Back
        </button>
      </div>
    );
  }

  // GENERATING
  if (step === 'generating') {
    return (
      <div className="copilot-container generating">
        <Icons.Settings size={80} color="#8B5CF6" className="spinning-icon" />

        <h2>Building Your AI Strategy</h2>
        <p>Creating a personalized strategy for {data.businessName}</p>

        <div className="progress-container">
          <div className="progress-bar-animated" style={{ width: `${progress}%` }}></div>
        </div>

        <div className="progress-steps">
          <div className={progress >= 25 ? 'step active' : 'step'}>
            <Icons.CheckCircle size={24} color={progress >= 25 ? '#10b981' : '#666'} />
            <p>Analyzing business</p>
          </div>
          <div className={progress >= 50 ? 'step active' : 'step'}>
            <Icons.CheckCircle size={24} color={progress >= 50 ? '#10b981' : '#666'} />
            <p>Crafting personality</p>
          </div>
          <div className={progress >= 75 ? 'step active' : 'step'}>
            <Icons.CheckCircle size={24} color={progress >= 75 ? '#10b981' : '#666'} />
            <p>Designing flow</p>
          </div>
          <div className={progress >= 100 ? 'step active' : 'step'}>
            <Icons.CheckCircle size={24} color={progress >= 100 ? '#10b981' : '#666'} />
            <p>Optimizing</p>
          </div>
        </div>
      </div>
    );
  }

  // COMPLETE
  if (step === 'complete') {
    return (
      <div className="copilot-container complete">
        <Icons.CheckCircle size={100} color="#10b981" className="success-icon" />

        <h2>Strategy Created Successfully!</h2>
        <p>Your AI agent for {data.businessName} is ready</p>

        <div className="success-message">
          <p>Redirecting to your strategies...</p>
        </div>
      </div>
    );
  }

  return null;
}

export default CoPilot;
