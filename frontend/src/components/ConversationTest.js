import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Icons from './Icons';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

function ConversationTest() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [contactName, setContactName] = useState('John');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await axios.get(`${API_URL}/templates`);
      setTemplates(res.data);
      if (res.data.length > 0) {
        setSelectedTemplate(res.data[0].id);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const startConversation = async () => {
    if (!selectedTemplate) {
      alert('Please select a template');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/conversations/start`, {
        templateId: selectedTemplate,
        contactName: contactName,
        contactPhone: '+1234567890'
      });
      
      setConversationId(res.data.conversationId);
      setMessages(res.data.messages);
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Error starting conversation');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !conversationId) return;

    const userMessage = inputMessage;
    setInputMessage('');
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/conversations/${conversationId}/message`, {
        message: userMessage
      });
      
      setMessages(res.data.messages);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message');
    } finally {
      setLoading(false);
    }
  };

  const resetConversation = () => {
    setConversationId(null);
    setMessages([]);
    setInputMessage('');
  };

  const getTimeOnly = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="conversation-test-page">
      <div className="test-header">
        <div>
          <h1>
            <Icons.TestAI size={32} style={{ marginRight: '12px', verticalAlign: 'middle' }} color="#8B5CF6" />
            Test Your AI Agent
          </h1>
          <p className="page-subtitle">Test conversations in real-time with your AI agent</p>
        </div>
        {conversationId && (
          <button className="btn btn-secondary" onClick={resetConversation}>
            🔄 Reset Conversation
          </button>
        )}
      </div>

      {!conversationId ? (
        <div className="test-setup-card">
          <div className="setup-content">
            <div className="setup-icon">🤖</div>
            <h2>Choose a Strategy to Test</h2>
            <p>Select an AI agent below and start a test conversation</p>
            
            <div className="form-group">
              <label>Select AI Agent</label>
              <select 
                value={selectedTemplate} 
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="select-large"
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Your Name</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Enter your name"
                className="input-large"
              />
            </div>

            {templates.length === 0 ? (
              <div className="empty-state" style={{ marginTop: '2rem' }}>
                <h3>No AI agents available</h3>
                <p>Create an AI agent first to test conversations</p>
              </div>
            ) : (
              <button 
                className="btn btn-mint btn-large" 
                onClick={startConversation}
                disabled={loading}
              >
                {loading ? '⏳ Starting...' : '🚀 Start Conversation'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="conversation-interface">
          {/* Conversation Header */}
          <div className="conversation-header">
            <div className="contact-info">
              <div className="contact-avatar">{contactName.charAt(0).toUpperCase()}</div>
              <div>
                <h3>{contactName}</h3>
                <p className="contact-status">
                  <span className="status-dot active"></span>
                  Active conversation
                </p>
              </div>
            </div>
            <div className="conversation-actions">
              <button className="btn-icon-action" title="View Details">ℹ️</button>
              <button className="btn-icon-action" title="Full Screen">⛶</button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="messages-container">
            <div className="system-message">
              <span className="system-icon">⚡</span>
              <span>Conversation started at {getTimeOnly(messages[0]?.timestamp)}</span>
            </div>

            {messages.map((msg, idx) => (
              <div key={idx} className={`message-wrapper ${msg.sender}`}>
                {msg.sender === 'bot' ? (
                  <div className="message-group bot-message">
                    <div className="message-avatar bot">
                      <span>🤖</span>
                    </div>
                    <div className="message-content-wrapper">
                      <div className="message-bubble bot">
                        <p>{msg.content}</p>
                      </div>
                      <span className="message-timestamp">{getTimeOnly(msg.timestamp)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="message-group user-message">
                    <div className="message-content-wrapper">
                      <div className="message-bubble user">
                        <p>{msg.content}</p>
                      </div>
                      <span className="message-timestamp">{getTimeOnly(msg.timestamp)}</span>
                    </div>
                    <div className="message-avatar user">
                      <span>{contactName.charAt(0).toUpperCase()}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="message-wrapper bot">
                <div className="message-group bot-message">
                  <div className="message-avatar bot">
                    <span>🤖</span>
                  </div>
                  <div className="message-content-wrapper">
                    <div className="message-bubble bot typing">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="message-input-area">
            <form onSubmit={sendMessage} className="message-input-form">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={loading}
                className="message-input"
              />
              <button 
                type="submit" 
                className="btn-send"
                disabled={loading || !inputMessage.trim()}
              >
                <span className="send-icon">➤</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Test Scenarios Sidebar */}
      {conversationId && (
        <div className="test-scenarios">
          <h3>💡 Test Scenarios</h3>
          <p>Try these messages to test AI behavior:</p>
          <div className="scenario-list">
            <button className="scenario-item" onClick={() => setInputMessage('Yes')}>
              ✓ "Yes" - Agree
            </button>
            <button className="scenario-item" onClick={() => setInputMessage('I want to book')}>
              📅 "I want to book" - Trigger booking
            </button>
            <button className="scenario-item" onClick={() => setInputMessage('How much?')}>
              💰 "How much?" - Ask pricing
            </button>
            <button className="scenario-item" onClick={() => setInputMessage('Not interested')}>
              ✕ "Not interested" - Decline
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConversationTest;