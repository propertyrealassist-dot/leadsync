import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './TestAI.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function TestAI() {
  const navigate = useNavigate();
  const [strategies, setStrategies] = useState([]);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [userName, setUserName] = useState('');
  const [messages, setMessages] = useState([]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  useEffect(() => {
    loadStrategies();
  }, []);

  const loadStrategies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStrategies(response.data);
      if (response.data.length > 0) {
        setSelectedStrategy(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to load strategies:', error);
    }
  };

  const startConversation = async () => {
    if (!selectedStrategy || !userName.trim()) return;

    setConversationStarted(true);
    setLoading(true);

    // Generate a simple conversation ID
    const newConversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setConversationId(newConversationId);

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('Not authenticated - please log in again');
      }

      // Get the initial greeting from the AI
      const response = await axios.post(
        `${API_URL}/api/test-ai/conversation`,
        {
          strategyId: selectedStrategy,
          userName: userName,
          message: '__INIT__', // Special message to trigger initial greeting
          conversationHistory: []
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const initialMessage = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date()
      };

      setMessages([initialMessage]);
      setConversationHistory([initialMessage]);

    } catch (error) {
      console.error('❌ Failed to start conversation:', error);

      // Fallback to generic greeting if API fails
      const fallbackMessage = {
        role: 'assistant',
        content: 'Hello! How can I help you today?',
        timestamp: new Date()
      };

      setMessages([fallbackMessage]);
      setConversationHistory([fallbackMessage]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage = inputMessage.trim();

    // Debug logging
    console.log('🤖 Sending message to AI...');
    console.log('Selected Strategy:', selectedStrategy);
    console.log('Selected Strategy Type:', typeof selectedStrategy);

    // Get the actual strategy ID (handle both string and object cases)
    const strategyId = typeof selectedStrategy === 'string'
      ? selectedStrategy
      : selectedStrategy?.id;

    console.log('Strategy ID to send:', strategyId);

    if (!strategyId) {
      alert('Please select a strategy first');
      return;
    }

    const userMsg = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    const newHistory = [...conversationHistory, userMsg];

    setConversationHistory(newHistory);
    setMessages(newHistory);
    setInputMessage('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('Not authenticated - please log in again');
      }

      console.log('Message:', userMessage);

      const response = await axios.post(
        `${API_URL}/api/test-ai/conversation`,
        {
          strategyId: strategyId,
          userName: userName,
          message: userMessage,
          conversationHistory: conversationHistory
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ AI response received:', response.data);

      const aiMessage = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date()
      };

      const updatedHistory = [...newHistory, aiMessage];
      setConversationHistory(updatedHistory);
      setMessages(updatedHistory);

    } catch (error) {
      console.error('❌ Failed to get AI response:', error);

      let errorMessage = 'Failed to get response. ';

      if (error.response?.status === 403) {
        errorMessage += 'Authentication failed. Please log in again.';
        setTimeout(() => navigate('/login'), 2000);
      } else if (error.response?.status === 404) {
        errorMessage += 'Strategy not found.';
      } else if (error.response?.data?.error) {
        errorMessage += error.response.data.error;
      } else {
        errorMessage += error.message;
      }

      const errorMsg = {
        role: 'assistant',
        content: `⚠️ ${errorMessage}`,
        timestamp: new Date()
      };

      const updatedHistory = [...newHistory, errorMsg];
      setConversationHistory(updatedHistory);
      setMessages(updatedHistory);
    } finally {
      setLoading(false);
    }
  };

  const resetConversation = () => {
    setConversationStarted(false);
    setMessages([]);
    setConversationHistory([]);
    setConversationId(null);
    setUserName('');
  };

  const endConversation = () => {
    if (window.confirm('Are you sure you want to end this conversation?')) {
      resetConversation();
    }
  };

  const testScenarios = [
    { icon: '👋', text: 'Greeting test' },
    { icon: '📅', text: 'Book appointment' },
    { icon: '❓', text: 'Ask about pricing' },
    { icon: '🔄', text: 'Reschedule request' }
  ];

  const selectedStrategyData = strategies.find(s => s.id === selectedStrategy);

  return (
    <div className="test-ai-page">
      {/* Header */}
      <div className="test-ai-header">
        <div className="header-content">
          <div className="header-icon">⭐</div>
          <div className="header-text">
            <h1>Test Your AI Agent</h1>
            <p>Test conversations in real-time with your AI agent</p>
          </div>
        </div>
        <button className="btn-reset" onClick={resetConversation}>
          <span>🔄</span>
          Reset Test
        </button>
      </div>

      <div className="test-ai-content">
        {!conversationStarted ? (
          /* Strategy Selector */
          <div className="strategy-selector-panel">
            <div className="selector-card">
              <div className="card-icon">💬</div>
              <h2>Choose a Strategy to Test</h2>
              <p>Select an AI agent below and start a test conversation</p>

              <div className="strategy-dropdown">
                <label>SELECT AI AGENT</label>
                <select
                  className="strategy-select"
                  value={selectedStrategy || ''}
                  onChange={(e) => {
                    console.log('🔍 Dropdown changed to:', e.target.value);
                    setSelectedStrategy(e.target.value);
                  }}
                >
                  {strategies.map(strategy => (
                    <option key={strategy.id} value={strategy.id}>
                      {strategy.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedStrategyData && (
                <div className="strategy-preview">
                  <h3>{selectedStrategyData.name}</h3>
                  <p>{selectedStrategyData.description || 'No description available'}</p>
                  <div className="strategy-stats">
                    <div className="stat">
                      <span className="stat-icon">💬</span>
                      <span className="stat-label">Messages</span>
                      <span className="stat-value">
                        {selectedStrategyData.conversationSteps?.length || 0}
                      </span>
                    </div>
                    <div className="stat">
                      <span className="stat-icon">🎯</span>
                      <span className="stat-label">Steps</span>
                      <span className="stat-value">
                        {selectedStrategyData.conversationSteps?.length || 0}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="name-input-section">
                <label>YOUR NAME</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && startConversation()}
                />
              </div>

              <button
                className="btn-start"
                onClick={startConversation}
                disabled={!selectedStrategy || !userName.trim()}
              >
                <span>▶️</span>
                Start Conversation
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Interface */}
            <div className="chat-interface">
              <div className="chat-header">
                <div className="agent-info">
                  <div className="agent-avatar">🤖</div>
                  <div className="agent-details">
                    <h3>{selectedStrategyData?.name || 'AI Agent'}</h3>
                    <div className="status">
                      <span className="status-dot"></span>
                      Active
                    </div>
                    {conversationId && (
                      <div className="conversation-id">
                        ID: {conversationId.substring(5, 13)}...
                      </div>
                    )}
                  </div>
                </div>
                <div className="conversation-controls">
                  <button className="btn-restart" onClick={resetConversation}>
                    🔄 Restart
                  </button>
                  <button className="btn-end-conversation" onClick={endConversation}>
                    End conversation
                  </button>
                </div>
              </div>

              <div className="messages-container">
                <div className="conversation-start">
                  <div className="start-icon">🚀</div>
                  <p>Conversation started</p>
                </div>

                {messages.map((message, index) => (
                  <div key={index} className={`message ${message.role}`}>
                    <div className="message-avatar">
                      {message.role === 'assistant' ? (
                        <div className="avatar-bot">🤖</div>
                      ) : (
                        <div className="avatar-user">👤</div>
                      )}
                    </div>
                    <div className="message-content">
                      <div className="message-bubble">
                        {message.content}
                      </div>
                      <div className="message-time">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="message assistant">
                    <div className="message-avatar">
                      <div className="avatar-bot">🤖</div>
                    </div>
                    <div className="message-content">
                      <div className="message-bubble typing">
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="chat-input-area">
                <div className="input-container">
                  <textarea
                    className="message-input"
                    placeholder="Type your message..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    rows={1}
                  />
                  <button
                    className="btn-send"
                    onClick={sendMessage}
                    disabled={!inputMessage.trim()}
                  >
                    ➤
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TestAI;
