import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Billing.css';

const Billing = () => {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState('free');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUser(response.data);
      setSelectedPlan(response.data.subscriptionPlan || 'free');
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Free Plan',
      price: '$0',
      period: 'forever',
      color: '#6B7280',
      features: [
        '✅ 1 AI Strategy',
        '✅ 100 Conversations/month',
        '✅ Basic Analytics',
        '✅ Email Support',
        '❌ Advanced AI Features',
        '❌ Priority Support',
        '❌ Custom Integrations',
        '❌ White Label Options'
      ]
    },
    {
      id: 'pro',
      name: 'Pro Plan',
      price: '$49',
      period: '/month',
      color: '#8B5CF6',
      popular: true,
      features: [
        '✅ Unlimited AI Strategies',
        '✅ 10,000 Conversations/month',
        '✅ Advanced Analytics',
        '✅ Priority Email Support',
        '✅ Advanced AI Features',
        '✅ API Access',
        '✅ Custom Integrations',
        '❌ White Label Options'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '$299',
      period: '/month',
      color: '#EC4899',
      features: [
        '✅ Unlimited Everything',
        '✅ Unlimited Conversations',
        '✅ Advanced Analytics & Reports',
        '✅ 24/7 Priority Support',
        '✅ Dedicated Account Manager',
        '✅ Custom AI Training',
        '✅ White Label Options',
        '✅ SLA Guarantees'
      ]
    }
  ];

  const handleUpgrade = (planId) => {
    if (planId === 'free') return;

    alert(`Upgrade to ${planId} plan coming soon! This will integrate with Stripe for payments.`);
  };

  if (loading) {
    return (
      <div className="billing-page">
        <div className="billing-loading">
          <div className="spinner"></div>
          <p>Loading billing information...</p>
        </div>
      </div>
    );
  }

  const currentPlan = plans.find(p => p.id === selectedPlan);

  return (
    <div className="billing-page">
      <div className="billing-header">
        <h1>💳 Billing & Subscription</h1>
        <p>Manage your subscription and billing information</p>
      </div>

      {/* Current Plan Banner */}
      <div className="current-plan-banner" style={{ borderColor: currentPlan.color }}>
        <div className="banner-content">
          <div className="banner-icon" style={{ background: `${currentPlan.color}22` }}>
            {selectedPlan === 'free' ? '🆓' : selectedPlan === 'pro' ? '⭐' : '👑'}
          </div>
          <div className="banner-info">
            <h3>Your Current Plan: <span style={{ color: currentPlan.color }}>{currentPlan.name}</span></h3>
            <p>
              {selectedPlan === 'free'
                ? 'Upgrade to unlock more features and grow your business'
                : selectedPlan === 'pro'
                ? 'Next billing date: January 15, 2025'
                : 'Premium support with dedicated account manager'}
            </p>
          </div>
        </div>
        {selectedPlan !== 'enterprise' && (
          <button
            className="btn-upgrade-banner"
            onClick={() => handleUpgrade(selectedPlan === 'free' ? 'pro' : 'enterprise')}
          >
            Upgrade Now
          </button>
        )}
      </div>

      {/* Plans Grid */}
      <div className="plans-section">
        <h2>Choose Your Plan</h2>
        <div className="plans-grid">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`plan-card ${plan.id === selectedPlan ? 'active' : ''} ${plan.popular ? 'popular' : ''}`}
              style={{ borderColor: plan.id === selectedPlan ? plan.color : 'rgba(139, 92, 246, 0.2)' }}
            >
              {plan.popular && <div className="popular-badge">MOST POPULAR</div>}

              <div className="plan-header">
                <h3>{plan.name}</h3>
                <div className="plan-price">
                  <span className="price">{plan.price}</span>
                  <span className="period">{plan.period}</span>
                </div>
              </div>

              <div className="plan-features">
                {plan.features.map((feature, index) => (
                  <div key={index} className="feature-item">
                    {feature}
                  </div>
                ))}
              </div>

              <button
                className={`plan-button ${plan.id === selectedPlan ? 'current' : ''}`}
                style={{
                  background: plan.id === selectedPlan
                    ? 'rgba(255, 255, 255, 0.1)'
                    : `linear-gradient(135deg, ${plan.color}, ${plan.color}dd)`
                }}
                onClick={() => handleUpgrade(plan.id)}
                disabled={plan.id === selectedPlan}
              >
                {plan.id === selectedPlan ? 'Current Plan' : plan.id === 'free' ? 'Downgrade' : 'Upgrade'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Billing History */}
      {selectedPlan !== 'free' && (
        <div className="billing-history">
          <h2>Billing History</h2>
          <div className="history-card">
            <div className="history-item">
              <div className="history-info">
                <span className="history-icon">📄</span>
                <div>
                  <h4>December 2024 - {currentPlan.name}</h4>
                  <p>Payment successful</p>
                </div>
              </div>
              <div className="history-actions">
                <span className="amount">{currentPlan.price}</span>
                <button className="btn-download">Download</button>
              </div>
            </div>

            <div className="history-item">
              <div className="history-info">
                <span className="history-icon">📄</span>
                <div>
                  <h4>November 2024 - {currentPlan.name}</h4>
                  <p>Payment successful</p>
                </div>
              </div>
              <div className="history-actions">
                <span className="amount">{currentPlan.price}</span>
                <button className="btn-download">Download</button>
              </div>
            </div>

            <div className="history-item">
              <div className="history-info">
                <span className="history-icon">📄</span>
                <div>
                  <h4>October 2024 - {currentPlan.name}</h4>
                  <p>Payment successful</p>
                </div>
              </div>
              <div className="history-actions">
                <span className="amount">{currentPlan.price}</span>
                <button className="btn-download">Download</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method */}
      {selectedPlan !== 'free' && (
        <div className="payment-method">
          <h2>Payment Method</h2>
          <div className="payment-card">
            <div className="card-display">
              <span className="card-icon">💳</span>
              <div className="card-info">
                <h4>Visa ending in 4242</h4>
                <p>Expires 12/2025</p>
              </div>
            </div>
            <button className="btn-secondary">Update Card</button>
          </div>
        </div>
      )}

      {/* Cancel Subscription */}
      {selectedPlan !== 'free' && (
        <div className="danger-zone">
          <h2>⚠️ Danger Zone</h2>
          <p>Cancel your subscription and downgrade to Free plan</p>
          <button className="btn-danger">Cancel Subscription</button>
        </div>
      )}
    </div>
  );
};

export default Billing;
