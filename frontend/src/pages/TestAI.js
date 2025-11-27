import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './TestAI.css'

const API_URL = process.env.REACT_APP_API_URL || 'https://api.realassistagents.com'

function TestAI() {
  const navigate = useNavigate()
  const messagesEndRef = useRef(null)
  const [strategies, setStrategies] = useState([])
  const [selectedStrategy, setSelectedStrategy] = useState(null)
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState(null)

  useEffect(() => {
    loadStrategies()
    loadTestConversations()
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      loadConversationMessages(selectedConversation.id)
    }
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadStrategies = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/templates`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStrategies(response.data)
      if (response.data.length > 0) {
        setSelectedStrategy(response.data[0])
      }
    } catch (error) {
      console.error('Failed to load strategies:', error)
    }
  }

  const loadTestConversations = () => {
    // Mock test conversations
    const mockConversations = [
      {
        id: 'test-1',
        lead_name: 'Test Lead #1',
        last_message_at: new Date().toISOString(),
        last_message_preview: 'Hey, I\'m interested in your services...',
        unread_count: 0,
        is_active: true
      },
      {
        id: 'test-2',
        lead_name: 'Test Lead #2',
        last_message_at: new Date(Date.now() - 3600000).toISOString(),
        last_message_preview: 'Can you tell me more about pricing?',
        unread_count: 0,
        is_active: true
      }
    ]
    setConversations(mockConversations)
  }

  const loadConversationMessages = (convId) => {
    // Load messages for selected conversation from state
    const conv = conversations.find(c => c.id === convId)
    if (conv && conv.messages) {
      setMessages(conv.messages)
      setConversationId(convId)
    } else {
      setMessages([])
      setConversationId(convId)
    }
  }

  const startNewConversation = async () => {
    if (!selectedStrategy) {
      alert('Please select a strategy first')
      return
    }

    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(
        `${API_URL}/api/test-ai/conversation`,
        {
          strategyId: selectedStrategy.id,
          userName: 'Test User',
          message: '__INIT__',
          conversationHistory: []
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      const initialMessage = {
        id: Date.now(),
        body: response.data.response,
        direction: 'inbound',
        created_at: new Date().toISOString(),
        is_ai_generated: true
      }

      const newConv = {
        id: response.data.conversationId || `test-${Date.now()}`,
        lead_name: 'New Test Conversation',
        last_message_at: new Date().toISOString(),
        last_message_preview: response.data.response.substring(0, 50) + '...',
        unread_count: 0,
        is_active: true,
        messages: [initialMessage]
      }

      setConversations([newConv, ...conversations])
      setSelectedConversation(newConv)
      setMessages([initialMessage])
      setConversationId(newConv.id)
    } catch (error) {
      console.error('Failed to start conversation:', error)
      alert('Failed to start conversation. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !selectedStrategy) return

    const userMessage = {
      id: Date.now(),
      body: newMessage,
      direction: 'outbound',
      created_at: new Date().toISOString(),
      is_ai_generated: false
    }

    setMessages([...messages, userMessage])
    setNewMessage('')
    setIsLoading(true)

    try {
      const token = localStorage.getItem('token')

      // Build conversation history from messages
      const conversationHistory = messages.map(msg => ({
        role: msg.direction === 'outbound' ? 'user' : 'assistant',
        content: msg.body
      }))

      const response = await axios.post(
        `${API_URL}/api/test-ai/conversation`,
        {
          strategyId: selectedStrategy.id,
          userName: selectedConversation.lead_name,
          message: newMessage,
          conversationHistory: conversationHistory
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      const aiMessage = {
        id: Date.now() + 1,
        body: response.data.response,
        direction: 'inbound',
        created_at: new Date().toISOString(),
        is_ai_generated: true
      }

      const updatedMessages = [...messages, userMessage, aiMessage]
      setMessages(updatedMessages)

      // Update conversation in list
      const updatedConversations = conversations.map(conv =>
        conv.id === selectedConversation.id
          ? {
              ...conv,
              last_message_preview: response.data.response.substring(0, 50) + '...',
              last_message_at: new Date().toISOString(),
              messages: updatedMessages
            }
          : conv
      )
      setConversations(updatedConversations)
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const endConversation = () => {
    if (window.confirm('End this test conversation?')) {
      const updatedConversations = conversations.filter(
        c => c.id !== selectedConversation?.id
      )
      setConversations(updatedConversations)
      setSelectedConversation(null)
      setMessages([])
      setConversationId(null)
    }
  }

  const restartConversation = () => {
    setMessages([])
    setConversationId(null)
    startNewConversation()
  }

  return (
    <div className="test-ai-modern-page">
      <div className="test-ai-header">
        <div className="test-ai-header-left">
          <h1>🧪 Test AI</h1>
          <p>Test your AI agents with real-time conversations</p>
        </div>
        <div className="test-ai-header-right">
          <div className="strategy-selector">
            <label>Strategy:</label>
            <select
              value={selectedStrategy?.id || ''}
              onChange={(e) => {
                const strategy = strategies.find(s => s.id === e.target.value)
                setSelectedStrategy(strategy)
              }}
              className="strategy-dropdown"
            >
              {strategies.map(strategy => (
                <option key={strategy.id} value={strategy.id}>
                  {strategy.name}
                </option>
              ))}
            </select>
          </div>
          <button
            className="new-conversation-btn"
            onClick={startNewConversation}
            disabled={isLoading || !selectedStrategy}
          >
            ✨ New Conversation
          </button>
        </div>
      </div>

      <div className="test-ai-container">
        {/* Conversations List */}
        <div className="conversations-panel">
          <div className="panel-header">
            <h3>Test Conversations</h3>
            <span className="conversation-count">{conversations.length}</span>
          </div>
          <div className="conversations-list">
            {conversations.length === 0 ? (
              <div className="empty-conversations">
                <span className="empty-icon">💬</span>
                <p>No test conversations yet</p>
                <p className="empty-hint">Click "New Conversation" to start</p>
              </div>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  className={`conversation-item ${selectedConversation?.id === conv.id ? 'active' : ''}`}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <div className="conversation-avatar">
                    🤖
                  </div>
                  <div className="conversation-info">
                    <div className="conversation-header">
                      <span className="conversation-name">{conv.lead_name}</span>
                      <span className="conversation-time">{formatTime(conv.last_message_at)}</span>
                    </div>
                    <div className="conversation-preview">
                      <span className="preview-text">{conv.last_message_preview}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Messages Panel */}
        <div className="messages-panel">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <div className="chat-header-info">
                  <h3>{selectedConversation.lead_name}</h3>
                  <p>
                    {conversationId && (
                      <span className="conversation-id">
                        ID: {conversationId.substring(0, 8)}...
                      </span>
                    )}
                  </p>
                </div>
                <div className="chat-header-actions">
                  <button
                    className="icon-btn"
                    onClick={restartConversation}
                    title="Restart Conversation"
                    disabled={isLoading}
                  >
                    🔄
                  </button>
                  <button
                    className="icon-btn"
                    onClick={endConversation}
                    title="End Conversation"
                  >
                    ❌
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="messages-container">
                {messages.length === 0 ? (
                  <div className="empty-messages">
                    <span className="empty-icon">💬</span>
                    <p>Start the conversation</p>
                    <p className="empty-hint">Send a message to begin testing</p>
                  </div>
                ) : (
                  messages.map(message => (
                    <div
                      key={message.id}
                      className={`message ${message.direction === 'outbound' ? 'outbound' : 'inbound'}`}
                    >
                      <div className="message-bubble">
                        <p className="message-text">{message.body}</p>
                        <div className="message-meta">
                          <span className="message-time">{formatTime(message.created_at)}</span>
                          {message.is_ai_generated && (
                            <span className="ai-badge" title="AI Generated">✨ AI</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="message inbound">
                    <div className="message-bubble typing">
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

              {/* Input Area */}
              <div className="message-input-area">
                <div className="input-toolbar">
                  <button className="toolbar-btn" title="Templates">
                    📄
                  </button>
                  <button className="toolbar-btn" title="AI Suggestions">
                    ✨
                  </button>
                  <button className="toolbar-btn" title="Emoji">
                    😊
                  </button>
                </div>
                <div className="input-container">
                  <textarea
                    className="message-input"
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    rows={3}
                    disabled={isLoading}
                  />
                  <button
                    className="send-btn"
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || isLoading}
                  >
                    Send →
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="no-conversation-selected">
              <div className="empty-state">
                <span className="empty-icon">🤖</span>
                <h3>Select or start a test conversation</h3>
                <p>Choose a conversation from the list or create a new one to start testing your AI agent</p>
                <button
                  className="primary-btn"
                  onClick={startNewConversation}
                  disabled={isLoading || !selectedStrategy}
                >
                  ✨ Start New Conversation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TestAI
