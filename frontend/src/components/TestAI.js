import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Icons from './Icons';
import './TestAI.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function TestAI() {
  const navigate = useNavigate();
  const [strategies, setStrategies] = useState([]);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadStrategies();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadStrategies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStrategies(response.data);
    } catch (error) {
      console.error('Error loading strategies:', error);
    }
  };

  const startTest = (strategy) => {
    setSelectedStrategy(strategy);
    setTestStarted(true);
    setMessages([
      {
        id: 1,
        type: 'ai',
        text: strategy.initialMessage || `Hey! Thanks for reaching out. Can you confirm this is {{contact.first_name}}?`,
        timestamp: new Date()
      }
    ]);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      text: inputMessage,
      timestamp: new Date()
    };

    setMessages([...messages, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateAIResponse(inputMessage, selectedStrategy);
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        type: 'ai',
        text: aiResponse,
        timestamp: new Date()
      }]);
      setIsTyping(false);
    }, 1500);
  };

  const generateAIResponse = (userInput, strategy) => {
    const input = userInput.toLowerCase();

    // Check FAQs
    if (strategy.faqs && strategy.faqs.length > 0) {
      for (let faq of strategy.faqs) {
        if (input.includes(faq.question.toLowerCase().substring(0, 10))) {
          return faq.answer;
        }
      }
    }

    // Check qualification questions
    if (strategy.qualificationQuestions && strategy.qualificationQuestions.length > 0) {
      const unansweredQuestion = strategy.qualificationQuestions.find(q =>
        !messages.some(m => m.text.includes(q.text))
      );
      if (unansweredQuestion) {
        return unansweredQuestion.text;
      }
    }

    // Default responses
    if (input.includes('yes') || input.includes('yeah') || input.includes('yep')) {
      return "Great! Let me help you with that.";
    }

    if (input.includes('no') || input.includes('nope')) {
      return "No problem! Is there anything else I can help you with?";
    }

    if (input.includes('price') || input.includes('cost') || input.includes('how much')) {
      return "Our pricing is customized based on your specific needs. Would you like to schedule a call to discuss?";
    }

    // CTA
    if (messages.length > 4 && strategy.cta) {
      return strategy.cta;
    }

    return "I understand. Can you tell me more about what you're looking for?";
  };

  const resetTest = () => {
    setSelectedStrategy(null);
    setMessages([]);
    setTestStarted(false);
    setInputMessage('');
  };

  if (!testStarted) {
    return (
      <div className="test-ai-container">
        <div className="page-header">
          <Icons.TestAI size={48} color="#8B5CF6" />
          <div>
            <h1>Test Your AI Agent</h1>
            <p>Simulate conversations in real-time</p>
          </div>
        </div>

        {strategies.length === 0 ? (
          <div className="empty-state">
            <Icons.Target size={64} color="#8B5CF6" />
            <h2>No Strategies Found</h2>
            <p>Create a strategy first to test it</p>
            <button
              onClick={() => navigate('/strategies')}
              className="btn-primary"
            >
              <Icons.Plus size={20} />
              Create Strategy
            </button>
          </div>
        ) : (
          <div className="strategies-grid">
            {strategies.map(strategy => (
              <div
                key={strategy._id}
                className="strategy-test-card"
                onClick={() => startTest(strategy)}
              >
                <div className="strategy-test-header">
                  <Icons.Target size={40} color="#8B5CF6" />
                  <div>
                    <h3>{strategy.name}</h3>
                    <span className="strategy-tag">{strategy.tag}</span>
                  </div>
                </div>
                <p className="strategy-tone">{strategy.tone}</p>
                <button className="btn-test">
                  <Icons.Lightning size={18} />
                  Start Test
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="test-ai-container">
      <div className="test-header">
        <div className="test-header-left">
          <button onClick={resetTest} className="btn-back">
            <Icons.ArrowRight size={20} style={{ transform: 'rotate(180deg)' }} />
            Back
          </button>
          <div className="test-strategy-info">
            <Icons.Target size={32} color="#8B5CF6" />
            <div>
              <h2>{selectedStrategy.name}</h2>
              <span className="test-tag">{selectedStrategy.tag}</span>
            </div>
          </div>
        </div>
        <button onClick={resetTest} className="btn-reset">
          <Icons.X size={20} />
          Reset Chat
        </button>
      </div>

      <div className="chat-container">
        <div className="messages-container">
          {messages.map(message => (
            <div
              key={message.id}
              className={`message ${message.type === 'user' ? 'message-user' : 'message-ai'}`}
            >
              <div className="message-avatar">
                {message.type === 'ai' ? (
                  <Icons.CoPilot size={24} color="#8B5CF6" />
                ) : (
                  <Icons.Users size={24} color="#EC4899" />
                )}
              </div>
              <div className="message-content">
                <div className="message-text">{message.text}</div>
                <div className="message-time">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="message message-ai">
              <div className="message-avatar">
                <Icons.CoPilot size={24} color="#8B5CF6" />
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="input-container">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            className="message-input"
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim()}
            className="btn-send"
          >
            <Icons.Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default TestAI;
