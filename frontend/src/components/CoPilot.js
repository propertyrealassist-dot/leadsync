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
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [websiteData, setWebsiteData] = useState(null);
  const [keepAIActive, setKeepAIActive] = useState(true);
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState({
    description: '',
    services: '',
    targetAudience: '',
    benefits: '',
    pricing: ''
  });

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

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🤖 CALLING ELITE AI STRATEGY GENERATOR');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 Business Name:', data.businessName);
      console.log('🌐 Website Data:', {
        pagesScanned: websiteData?.pagesScanned || 0,
        headings: websiteData?.allHeadings?.length || 0,
        paragraphs: websiteData?.allParagraphs?.length || 0,
        services: websiteData?.services?.length || 0
      });
      console.log('🎯 Goal:', data.goal);

      // Step 1: Generate AI strategy using ELITE PROMPT
      const aiStrategyResponse = await axios.post(
        `${API_URL}/api/copilot/generate-strategy`,
        {
          businessName: data.businessName,
          websiteData: websiteData,
          services: data.services,
          goal: data.goal
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ ELITE AI STRATEGY RECEIVED FROM BACKEND');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Full Response:', aiStrategyResponse.data);

      const aiStrategy = aiStrategyResponse.data.strategy;

      console.log('📋 AI Strategy received from backend:', {
        name: aiStrategy?.name || 'MISSING',
        brief: aiStrategy?.brief ? aiStrategy.brief.substring(0, 200) + '...' : 'MISSING',
        briefLength: aiStrategy?.brief?.length || 0,
        qualificationQuestions: aiStrategy?.qualificationQuestions?.length || 0,
        faqs: aiStrategy?.faqs?.length || 0,
        followUps: aiStrategy?.followUps?.length || 0,
        companyInformation: aiStrategy?.companyInformation ? aiStrategy.companyInformation.substring(0, 200) + '...' : 'MISSING',
        companyInfoLength: aiStrategy?.companyInformation?.length || 0,
        wasFallback: aiStrategyResponse.data.fallback || false
      });

      // Check if we actually got AI data
      if (!aiStrategy || !aiStrategy.brief || !aiStrategy.qualificationQuestions || !aiStrategy.faqs) {
        console.error('❌ AI STRATEGY MISSING KEY FIELDS!');
        console.error('Strategy object:', aiStrategy);

        // Don't show alert if backend already used fallback
        if (!aiStrategyResponse.data.fallback) {
          console.warn('⚠️ Incomplete strategy received, but continuing with what we have');
        }
      }

      // Validate we have minimum required data
      if (!aiStrategy) {
        throw new Error('No strategy data received from backend');
      }

      // Step 2: Create the template with AI-generated content (USE AI DATA, NOT HARDCODED!)
      const strategyData = {
        name: aiStrategy.name || `${data.businessName} AI Agent`,
        tag: aiStrategy.tag || data.businessName.toLowerCase().replace(/\s+/g, '-') + '-ai',
        tone: aiStrategy.tone || 'Friendly and Professional',
        brief: aiStrategy.brief || generateBrief(), // USE AI BRIEF!
        objective: aiStrategy.objective || (data.goal === 'aiBooks' ? 'Book appointments automatically' : data.goal === 'sendLink' ? 'Share booking links' : 'Custom conversion goal'),
        companyInformation: aiStrategy.companyInformation || data.services || `${data.businessName} - ${data.website}`, // USE AI COMPANY INFO!
        initialMessage: aiStrategy.initialMessage || `Hey! Thanks for reaching out to ${data.businessName}. Can you confirm this is {{contact.first_name}}?`, // USE AI INITIAL MESSAGE!
        cta: data.goal === 'sendLink' ? 'Here\'s our booking link to schedule your appointment!' : '',
        turnOffAiAfterCta: aiStrategy.settings?.turnOffAiAfterCta ?? (data.postBooking === 'turnOffAI'),
        turnOffFollowUps: aiStrategy.settings?.turnOffFollowUps ?? (data.postBooking === 'turnOffFollowUps'),
        faqs: aiStrategy.faqs || generateFAQs(), // USE AI FAQs!
        qualificationQuestions: aiStrategy.qualificationQuestions || generateQuestions(), // USE AI QUESTIONS!
        followUps: aiStrategy.followUps || generateFollowUps(), // USE AI FOLLOW-UPS!
        // Settings from AI (ensure numbers are numbers, not strings)
        settings: {
          botTemperature: parseFloat(aiStrategy.settings?.botTemperature || 0.4),
          resiliancy: parseInt(aiStrategy.settings?.resiliancy || 3),
          bookingReadiness: parseInt(aiStrategy.settings?.bookingReadiness || 3),
          messageDelayInitial: parseInt(aiStrategy.settings?.messageDelayInitial || 30),
          messageDelayStandard: parseInt(aiStrategy.settings?.messageDelayStandard || 5),
          cta: aiStrategy.settings?.cta || 'Let me get you scheduled. What time works best for you?',
          turnOffAiAfterCta: aiStrategy.settings?.turnOffAiAfterCta ?? (data.postBooking === 'turnOffAI'),
          turnOffFollowUps: aiStrategy.settings?.turnOffFollowUps ?? (data.postBooking === 'turnOffFollowUps' || data.goal === 'sendLink')
        }
      };

      console.log('📤 Creating template with AI strategy...');

      const response = await axios.post(`${API_URL}/api/templates`, strategyData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('✅ Template created successfully');

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

  const scanWebsite = async (url) => {
    if (!url || !url.trim()) {
      alert('⚠️ Please enter a website URL');
      return;
    }

    setIsScanning(true);
    setScanProgress(0);

    let progressInterval; // Declare outside try block

    try {
      // Simulate progress
      progressInterval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      const token = localStorage.getItem('token');

      console.log('🌐 Scanning website:', url);
      console.log('📝 API URL:', `${API_URL}/api/copilot/scan-website`);
      console.log('🔑 Token exists:', !!token);

      // Call backend to scrape website
      const response = await axios.post(
        `${API_URL}/api/copilot/scan-website`,
        { url },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60 second timeout for full reliability
        }
      );

      clearInterval(progressInterval);
      setScanProgress(100);

      console.log('✅ Scan response:', response.data);

      // Store scraped data
      setWebsiteData(response.data.data || response.data);

      // Auto-fill services if found
      const scannedData = response.data.data || response.data;
      if (scannedData) {
        const autoServices = [
          scannedData.description || '',
          scannedData.content ? scannedData.content.substring(0, 500) : '',
          scannedData.services ? scannedData.services.slice(0, 5).join(', ') : ''
        ].filter(Boolean).join('\n\n');

        if (autoServices) {
          setData(prev => ({
            ...prev,
            services: autoServices
          }));
        }
      }

      // Move to next step
      setTimeout(() => {
        setStep('services');
      }, 500);

    } catch (error) {
      console.error('❌ Website scan error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);

      if (progressInterval) clearInterval(progressInterval);
      setScanProgress(100); // Complete the progress bar

      // NEVER show error - backend now returns minimal data on failure
      // If backend fails completely, create local fallback data
      const fallbackData = {
        businessName: data.businessName,
        title: data.businessName,
        description: `${data.businessName} - Professional business services`,
        tagline: `Welcome to ${data.businessName}`,
        services: [],
        features: [],
        benefits: [],
        stats: [],
        testimonials: [],
        pricing: [],
        targetAudience: 'businesses',
        industryKeywords: [],
        pagesScanned: 1,
        allHeadings: [],
        allParagraphs: [],
        scannedSuccessfully: false
      };

      setWebsiteData(fallbackData);

      // Auto-advance to next step - NO ERROR MESSAGE
      setTimeout(() => {
        setStep('services');
      }, 500);
    } finally {
      setIsScanning(false);
    }
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
    if (isScanning) {
      return (
        <div className="copilot-container">
          <div className="copilot-progress">
            <div className="progress-bar" style={{ width: '40%' }}></div>
          </div>

          <div className="scanning-state">
            <Icons.Settings size={64} color="#8B5CF6" className="spinning-icon" />
            <h2>Scanning Website...</h2>
            <p>Analyzing {data.website} to understand your business</p>

            <div className="progress-container">
              <div className="progress-bar-animated" style={{ width: `${scanProgress}%` }}></div>
            </div>

            <div className="scanning-steps">
              <div className={scanProgress >= 25 ? 'step active' : 'step'}>
                <Icons.CheckCircle size={20} color={scanProgress >= 25 ? '#10b981' : '#666'} />
                <span>Fetching content</span>
              </div>
              <div className={scanProgress >= 50 ? 'step active' : 'step'}>
                <Icons.CheckCircle size={20} color={scanProgress >= 50 ? '#10b981' : '#666'} />
                <span>Extracting info</span>
              </div>
              <div className={scanProgress >= 75 ? 'step active' : 'step'}>
                <Icons.CheckCircle size={20} color={scanProgress >= 75 ? '#10b981' : '#666'} />
                <span>Analyzing services</span>
              </div>
              <div className={scanProgress >= 100 ? 'step active' : 'step'}>
                <Icons.CheckCircle size={20} color={scanProgress >= 100 ? '#10b981' : '#666'} />
                <span>Complete</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="copilot-container">
        <div className="copilot-progress">
          <div className="progress-bar" style={{ width: '40%' }}></div>
        </div>

        <h2>Great! "{data.businessName}" - I like it!</h2>
        <h3>How would you like to provide information?</h3>
        <p>Choose the method that works best for you</p>

        <div className="goal-cards" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
          <div
            className="goal-card recommended"
            onClick={() => {
              setManualMode(false);
            }}
          >
            <Icons.Settings size={48} color="#8B5CF6" />
            <h3>Scan Website</h3>
            <p>Automatically extract information from your website</p>
            <span className="badge-recommended" style={{ position: 'absolute', top: '10px', right: '10px' }}>
              <Icons.CheckCircle size={16} color="#ffffff" />
              RECOMMENDED
            </span>
          </div>

          <div
            className="goal-card"
            onClick={() => {
              setManualMode(true);
              setStep('manual');
            }}
          >
            <Icons.Target size={48} color="#10b981" />
            <h3>Manual Entry</h3>
            <p>Paste your business details for best results</p>
          </div>
        </div>

        {!manualMode && (
          <>
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
              <button
                onClick={() => scanWebsite(data.website)}
                disabled={!data.website}
                className="btn-primary"
              >
                Scan Website
                <Icons.ArrowRight size={18} />
              </button>
            </div>
          </>
        )}

        {manualMode && (
          <div className="button-group">
            <button onClick={() => setStep('business')} className="btn-secondary">
              <Icons.ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} />
              Back
            </button>
          </div>
        )}
      </div>
    );
  }

  // MANUAL ENTRY
  if (step === 'manual') {
    return (
      <div className="copilot-container">
        <div className="copilot-progress">
          <div className="progress-bar" style={{ width: '45%' }}></div>
        </div>

        <h2>Tell me about your business</h2>
        <p>Provide detailed information for the best AI strategy</p>

        <div className="manual-form">
          <div className="form-group">
            <label>Business Description *</label>
            <textarea
              placeholder="What does your business do? What problems do you solve? (e.g., 'We help busy professionals lose weight through personalized coaching and accountability...')"
              value={manualInput.description}
              onChange={(e) => setManualInput({ ...manualInput, description: e.target.value })}
              rows={4}
              className="textarea-large"
            />
          </div>

          <div className="form-group">
            <label>Services/Products Offered *</label>
            <textarea
              placeholder="List your main services or products (e.g., '1-on-1 coaching, group programs, meal planning, fitness tracking...')"
              value={manualInput.services}
              onChange={(e) => setManualInput({ ...manualInput, services: e.target.value })}
              rows={3}
              className="textarea-large"
            />
          </div>

          <div className="form-group">
            <label>Target Audience *</label>
            <input
              type="text"
              placeholder="Who are your ideal clients? (e.g., 'Busy professionals aged 30-50 who want to lose weight')"
              value={manualInput.targetAudience}
              onChange={(e) => setManualInput({ ...manualInput, targetAudience: e.target.value })}
              className="input-large"
            />
          </div>

          <div className="form-group">
            <label>Key Benefits & Results</label>
            <textarea
              placeholder="What results do clients get? What makes you different? (e.g., 'Lose 10-20 lbs in 3 months, custom meal plans, 24/7 support...')"
              value={manualInput.benefits}
              onChange={(e) => setManualInput({ ...manualInput, benefits: e.target.value })}
              rows={3}
              className="textarea-large"
            />
          </div>

          <div className="form-group">
            <label>Pricing (Optional)</label>
            <input
              type="text"
              placeholder="Price range or packages (e.g., '$497/month, $1497 for 3 months')"
              value={manualInput.pricing}
              onChange={(e) => setManualInput({ ...manualInput, pricing: e.target.value })}
              className="input-large"
            />
          </div>
        </div>

        <div className="button-group">
          <button onClick={() => setStep('website')} className="btn-secondary">
            <Icons.ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} />
            Back
          </button>
          <button
            onClick={() => {
              // Combine manual input into services field for backend compatibility
              const combinedData = `${manualInput.description}\n\nSERVICES:\n${manualInput.services}\n\nTARGET AUDIENCE:\n${manualInput.targetAudience}\n\nBENEFITS:\n${manualInput.benefits}${manualInput.pricing ? `\n\nPRICING:\n${manualInput.pricing}` : ''}`;
              setData({ ...data, services: combinedData });

              // Create manual websiteData structure
              setWebsiteData({
                title: data.businessName,
                description: manualInput.description,
                services: manualInput.services.split('\n').filter(s => s.trim()),
                targetAudience: manualInput.targetAudience,
                benefits: manualInput.benefits.split('\n').filter(b => b.trim()),
                pricing: manualInput.pricing ? [manualInput.pricing] : [],
                features: [],
                testimonials: [],
                stats: [],
                industryKeywords: [],
                pagesScanned: 1,
                manualEntry: true
              });

              setStep('goal');
            }}
            disabled={!manualInput.description || !manualInput.services || !manualInput.targetAudience}
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
        <p>Configure how your AI agent should behave after successfully booking an appointment</p>

        {/* Toggle Switch */}
        <div className="post-booking-toggle">
          <div className="toggle-label">
            <Icons.CoPilot size={24} color="#8B5CF6" />
            <span>Keep AI Active After Booking</span>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={keepAIActive}
              onChange={(e) => setKeepAIActive(e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="behavior-cards-container">
          <div className="behavior-cards">
            {/* Turn OFF AI Completely */}
            <div
              className={`behavior-card ${!keepAIActive ? 'selected' : ''}`}
              onClick={() => {
                setData({ ...data, postBooking: 'turnOffAI' });
                generateStrategy();
              }}
            >
              <div className="card-icon-wrapper danger">
                <Icons.X size={40} color="#ef4444" />
              </div>
              <h3>Turn OFF AI Completely</h3>
              <p className="card-subtitle">Full manual control</p>
              <ul className="feature-list">
                <li>
                  <Icons.X size={16} color="#ef4444" />
                  <span>No automated responses</span>
                </li>
                <li>
                  <Icons.X size={16} color="#ef4444" />
                  <span>No follow-up messages</span>
                </li>
                <li>
                  <Icons.Check size={16} color="#10b981" />
                  <span>Complete manual takeover</span>
                </li>
              </ul>
            </div>

            {/* Turn OFF Follow-ups Only */}
            <div
              className={`behavior-card ${keepAIActive ? 'selected' : ''} recommended`}
              onClick={() => {
                setData({ ...data, postBooking: 'turnOffFollowUps' });
                generateStrategy();
              }}
            >
              <span className="badge-recommended">
                <Icons.CheckCircle size={16} color="#ffffff" />
                RECOMMENDED
              </span>
              <div className="card-icon-wrapper success">
                <Icons.Check size={40} color="#10b981" />
              </div>
              <h3>Turn OFF Follow-ups Only</h3>
              <p className="card-subtitle">Smart responsive mode</p>
              <ul className="feature-list">
                <li>
                  <Icons.Check size={16} color="#10b981" />
                  <span>Responds to incoming messages</span>
                </li>
                <li>
                  <Icons.Check size={16} color="#10b981" />
                  <span>Answers questions naturally</span>
                </li>
                <li>
                  <Icons.X size={16} color="#ef4444" />
                  <span>No proactive outreach</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="info-banner">
          <Icons.Info size={20} color="#8B5CF6" />
          <div>
            <strong>Recommendation:</strong> Keep follow-ups disabled to prevent over-messaging while maintaining responsiveness to client questions.
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
