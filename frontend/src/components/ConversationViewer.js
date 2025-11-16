import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function ConversationViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversation();
  }, [id]);

  const loadConversation = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/conversations/${id}`);
      setConversation(res.data);
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading conversation...</div>;
  }

  if (!conversation) {
    return (
      <div className="card">
        <h2>Conversation not found</h2>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="conversation-viewer">
      <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ marginBottom: '1rem' }}>
        ← Back to Dashboard
      </button>

      <div className="card">
        <h2>Conversation Details</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <strong>Contact:</strong> {conversation.contact_name || 'Unknown'}
          </div>
          <div>
            <strong>Phone:</strong> {conversation.contact_phone || 'N/A'}
          </div>
          <div>
            <strong>Status:</strong> <span className={`status-badge status-${conversation.status}`}>{conversation.status}</span>
          </div>
          <div>
            <strong>Lead Score:</strong> {conversation.lead_score}
          </div>
          <div>
            <strong>Started:</strong> {new Date(conversation.started_at).toLocaleString()}
          </div>
          <div>
            <strong>Last Message:</strong> {new Date(conversation.last_message_at).toLocaleString()}
          </div>
        </div>

        <h3>Message History</h3>
        <div className="message-list">
          {conversation.messages && conversation.messages.length > 0 ? (
            conversation.messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.sender}`}>
                <div className="message-sender">
                  {msg.sender === 'bot' ? '🤖 AI Agent' : '👤 ' + conversation.contact_name}
                </div>
                <div className="message-content">{msg.content}</div>
                <div className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>No messages yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConversationViewer;