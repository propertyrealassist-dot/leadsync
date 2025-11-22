import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function Home() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalAgents: 0,
    totalConversations: 0,
    activeLeads: 0,
    appointmentsBooked: 0
  });
  const [recentAgents, setRecentAgents] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');

      // Load strategies
      const strategiesResponse = await axios.get(`${API_URL}/api/templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const totalAgents = strategiesResponse.data?.length || 0;

      // Load conversations
      let totalConversations = 0;
      let activeLeads = 0;
      try {
        const conversationsResponse = await axios.get(`${API_URL}/api/conversations`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        totalConversations = conversationsResponse.data?.data?.length || 0;
      } catch (err) {
        console.log('No conversations endpoint or error:', err);
      }

      // Load leads
      try {
        const leadsResponse = await axios.get(`${API_URL}/api/leads`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        activeLeads = leadsResponse.data?.data?.length || 0;
      } catch (err) {
        console.log('No leads endpoint or error:', err);
      }

      setStats({
        totalAgents,
        totalConversations,
        activeLeads,
        appointmentsBooked: 0
      });

      setRecentAgents(strategiesResponse.data.slice(0, 3));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Set everything to 0 on error
      setStats({
        totalAgents: 0,
        totalConversations: 0,
        activeLeads: 0,
        appointmentsBooked: 0
      });
    }
  };

  return (
    <div style={{ padding: '48px', minHeight: '100vh' }}>
      {/* Hero Section */}
      <div style={{ textAlign: 'center', marginBottom: '64px' }}>
        <h1 style={{
          fontSize: '56px',
          fontWeight: '700',
          color: 'white',
          margin: '0 0 16px 0',
          lineHeight: '1.2'
        }}>
          Welcome to <span style={{
            background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>LeadSync</span>
        </h1>
        <p style={{
          fontSize: '20px',
          color: 'rgba(255, 255, 255, 0.7)',
          margin: '0 0 40px 0'
        }}>
          AI-Powered Lead Management & Automation Platform
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/strategies')}
            style={{
              padding: '18px 36px',
              background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
              border: 'none',
              borderRadius: '16px',
              color: 'white',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 12px 32px rgba(139, 92, 246, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 24px rgba(139, 92, 246, 0.4)';
            }}
          >
            <span style={{ fontSize: '20px' }}>📋</span>
            Create AI Agent
          </button>

          <button
            onClick={() => navigate('/strategies')}
            style={{
              padding: '18px 36px',
              background: 'transparent',
              border: '2px solid rgba(139, 92, 246, 0.5)',
              borderRadius: '16px',
              color: 'white',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(139, 92, 246, 0.1)';
              e.target.style.borderColor = '#8B5CF6';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <span style={{ fontSize: '20px' }}>📊</span>
            View Strategies
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '32px',
        marginBottom: '64px',
        maxWidth: '1600px',
        margin: '0 auto 64px auto'
      }}>
        {/* AI Agents Card */}
        <div style={{
          background: 'rgba(26, 10, 46, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '24px',
          padding: '40px 36px',
          display: 'flex',
          alignItems: 'center',
          gap: '28px',
          minHeight: '180px',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(139, 92, 246, 0.4)';
          e.currentTarget.style.borderColor = '#8B5CF6';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
        }}
        >
          <div style={{
            width: '88px',
            height: '88px',
            background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
            borderRadius: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '44px',
            boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)',
            flexShrink: 0
          }}>
            🎯
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '14px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'rgba(255, 255, 255, 0.6)',
              marginBottom: '12px',
              fontWeight: '600'
            }}>
              AI AGENTS
            </div>
            <div style={{
              fontSize: '52px',
              fontWeight: '700',
              color: 'white',
              lineHeight: '1'
            }}>
              {stats.totalAgents}
            </div>
          </div>
        </div>

        {/* Total Conversations Card */}
        <div style={{
          background: 'rgba(26, 10, 46, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '24px',
          padding: '40px 36px',
          display: 'flex',
          alignItems: 'center',
          gap: '28px',
          minHeight: '180px',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(236, 72, 153, 0.4)';
          e.currentTarget.style.borderColor = '#EC4899';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
        }}
        >
          <div style={{
            width: '88px',
            height: '88px',
            background: 'linear-gradient(135deg, #EC4899, #8B5CF6)',
            borderRadius: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '44px',
            boxShadow: '0 8px 24px rgba(236, 72, 153, 0.4)',
            flexShrink: 0
          }}>
            💬
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '14px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'rgba(255, 255, 255, 0.6)',
              marginBottom: '12px',
              fontWeight: '600'
            }}>
              TOTAL CONVERSATIONS
            </div>
            <div style={{
              fontSize: '52px',
              fontWeight: '700',
              color: 'white',
              lineHeight: '1'
            }}>
              {stats.totalConversations}
            </div>
          </div>
        </div>

        {/* Active Leads Card */}
        <div style={{
          background: 'rgba(26, 10, 46, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '24px',
          padding: '40px 36px',
          display: 'flex',
          alignItems: 'center',
          gap: '28px',
          minHeight: '180px',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(245, 158, 11, 0.4)';
          e.currentTarget.style.borderColor = '#f59e0b';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
        }}
        >
          <div style={{
            width: '88px',
            height: '88px',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            borderRadius: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '44px',
            boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4)',
            flexShrink: 0
          }}>
            ⚡
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '14px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'rgba(255, 255, 255, 0.6)',
              marginBottom: '12px',
              fontWeight: '600'
            }}>
              ACTIVE LEADS
            </div>
            <div style={{
              fontSize: '52px',
              fontWeight: '700',
              color: 'white',
              lineHeight: '1'
            }}>
              {stats.activeLeads}
            </div>
          </div>
        </div>

        {/* Appointments Card */}
        <div style={{
          background: 'rgba(26, 10, 46, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '24px',
          padding: '40px 36px',
          display: 'flex',
          alignItems: 'center',
          gap: '28px',
          minHeight: '180px',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(16, 185, 129, 0.4)';
          e.currentTarget.style.borderColor = '#10b981';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
        }}
        >
          <div style={{
            width: '88px',
            height: '88px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '44px',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
            flexShrink: 0
          }}>
            📅
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '14px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'rgba(255, 255, 255, 0.6)',
              marginBottom: '12px',
              fontWeight: '600'
            }}>
              APPOINTMENTS
            </div>
            <div style={{
              fontSize: '52px',
              fontWeight: '700',
              color: 'white',
              lineHeight: '1'
            }}>
              {stats.appointmentsBooked}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Agents Section */}
      {recentAgents.length > 0 && (
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px'
          }}>
            <h2 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: 'white',
              margin: 0
            }}>
              Your AI Agents
            </h2>
            <button
              onClick={() => navigate('/strategies')}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(139, 92, 246, 0.1)';
                e.target.style.borderColor = '#8B5CF6';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.borderColor = 'rgba(139, 92, 246, 0.3)';
              }}
            >
              View All →
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '28px'
          }}>
            {recentAgents.map((agent) => (
              <div
                key={agent.id}
                style={{
                  background: 'rgba(26, 10, 46, 0.6)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '20px',
                  padding: '28px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => navigate(`/strategies`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(139, 92, 246, 0.3)';
                  e.currentTarget.style.borderColor = '#8B5CF6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: '20px'
                }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    flexShrink: 0
                  }}>
                    🤖
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: 'white',
                      margin: '0 0 6px 0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {agent.name}
                    </h3>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      background: 'rgba(139, 92, 246, 0.2)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '600',
                      color: '#8B5CF6',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Active
                    </span>
                  </div>
                </div>

                {agent.description && (
                  <p style={{
                    fontSize: '15px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    margin: '0 0 20px 0',
                    lineHeight: '1.6',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {agent.description}
                  </p>
                )}

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '14px'
                }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.5)',
                      marginBottom: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontWeight: '600'
                    }}>
                      Conversations
                    </div>
                    <div style={{
                      fontSize: '24px',
                      fontWeight: '700',
                      color: 'white'
                    }}>
                      0
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.5)',
                      marginBottom: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontWeight: '600'
                    }}>
                      Success Rate
                    </div>
                    <div style={{
                      fontSize: '24px',
                      fontWeight: '700',
                      color: '#10b981'
                    }}>
                      100%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
