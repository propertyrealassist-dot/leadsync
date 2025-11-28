import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './TestAI.css'

const API_URL = process.env.REACT_APP_API_URL || 'https://api.realassistagents.com'

// Message Templates
const MESSAGE_TEMPLATES = [
  { id: 1, label: 'Interested', text: "I'm interested in learning more about your services" },
  { id: 2, label: 'Pricing Question', text: "Can you tell me more about your pricing?" },
  { id: 3, label: 'Schedule Call', text: "I'd like to schedule a call to discuss this further" },
  { id: 4, label: 'Not Interested', text: "Thanks, but I'm not interested right now" },
  { id: 5, label: 'Need More Info', text: "Can you provide more information about this?" },
]

// Common Emojis
const EMOJI_LIST = [
  '😊', '👍', '❤️', '😂', '🎉', '🔥', '✨', '💯', '🙌', '👏',
  '😍', '🤔', '😎', '🚀', '💪', '🎯', '✅', '❌', '⭐', '💡'
]

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

  // Modal and toolbar states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState([])
  const [showAiSuggestions, setShowAiSuggestions] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  // Load conversations from database on mount
  useEffect(() => {
    loadStrategies()
    loadTestConversations()
  }, [])

  // Load messages when conversation selected
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

  const loadTestConversations = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/test-ai/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Transform database format to component format
      const transformedConversations = response.data.map(conv => ({
        id: conv.id,
        lead_name: conv.contact_name || conv.strategy_name || 'Test User',
        strategyId: conv.template_id,
        last_message_at: conv.last_message_timestamp || conv.last_message_at,
        last_message_preview: conv.last_message_preview || '',
        unread_count: 0,
        is_active: conv.status === 'active',
        message_count: conv.message_count || 0
      }))

      setConversations(transformedConversations)
    } catch (error) {
      console.error('Failed to load test conversations:', error)
      setConversations([])
    }
  }

  const loadConversationMessages = async (convId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/test-ai/conversations/${convId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Transform database messages to component format
      const transformedMessages = response.data.messages.map(msg => ({
        id: msg.id,
        body: msg.content,
        direction: msg.sender === 'user' ? 'outbound' : 'inbound',
        created_at: msg.timestamp,
        is_ai_generated: msg.sender === 'assistant'
      }))

      setMessages(transformedMessages)
      setConversationId(convId)
    } catch (error) {
      console.error('Failed to load conversation messages:', error)
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
        `${API_URL}/api/test-ai/conversations`,
        {
          strategyId: selectedStrategy.id,
          contactName: selectedStrategy.name
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      console.log('✅ New conversation created:', response.data.id)

      // Reload conversations list from database
      await loadTestConversations()

      // Load the new conversation and its messages
      const newConvResponse = await axios.get(
        `${API_URL}/api/test-ai/conversations/${response.data.id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      // Transform and select the new conversation
      const newConv = {
        id: newConvResponse.data.id,
        lead_name: newConvResponse.data.contact_name || selectedStrategy.name,
        strategyId: newConvResponse.data.template_id,
        last_message_at: newConvResponse.data.last_message_at,
        last_message_preview: response.data.initialMessage.substring(0, 50) + '...',
        unread_count: 0,
        is_active: true
      }

      setSelectedConversation(newConv)
      setConversationId(response.data.id)

      // Load messages
      await loadConversationMessages(response.data.id)
    } catch (error) {
      console.error('Failed to start conversation:', error)
      console.error('Error details:', error.response?.data)
      console.error('Error status:', error.response?.status)
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error'
      alert(`Failed to start conversation: ${errorMsg}`)
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    // CRITICAL: Use the conversation's LOCKED strategyId, not the dropdown selection
    const conversationStrategyId = selectedConversation.strategyId

    if (!conversationStrategyId) {
      alert('Error: This conversation is missing a strategy ID')
      return
    }

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

      console.log(`🎯 Sending message with LOCKED strategy ID: ${conversationStrategyId} for conversation: ${selectedConversation.lead_name}`)

      const response = await axios.post(
        `${API_URL}/api/test-ai/conversation`,
        {
          strategyId: conversationStrategyId,  // FIXED: Use conversation's locked strategy
          userName: selectedConversation.lead_name,
          message: newMessage,
          conversationHistory: conversationHistory,
          conversationId: conversationId  // CRITICAL: Include conversationId for database persistence
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      console.log('✅ Message sent, reloading from database')

      // Reload messages from database to ensure sync
      await loadConversationMessages(conversationId)

      // Reload conversations list to update preview
      await loadTestConversations()
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
    setConversationToDelete(selectedConversation)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (conversationToDelete) {
      try {
        const token = localStorage.getItem('token')
        await axios.delete(
          `${API_URL}/api/test-ai/conversations/${conversationToDelete.id}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )

        console.log('✅ Conversation deleted from database')

        // Reload conversations from database
        await loadTestConversations()

        // Clear selected conversation if it was deleted
        if (selectedConversation?.id === conversationToDelete.id) {
          setSelectedConversation(null)
          setMessages([])
          setConversationId(null)
        }

        setShowDeleteModal(false)
        setConversationToDelete(null)
      } catch (error) {
        console.error('Failed to delete conversation:', error)
        alert('Failed to delete conversation. Please try again.')
        setShowDeleteModal(false)
        setConversationToDelete(null)
      }
    }
  }

  const cancelDelete = () => {
    setShowDeleteModal(false)
    setConversationToDelete(null)
  }

  const restartConversation = () => {
    setMessages([])
    setConversationId(null)
    startNewConversation()
  }

  const insertTemplate = (text) => {
    setNewMessage(text)
    setShowTemplates(false)
  }

  const insertEmoji = (emoji) => {
    setNewMessage(newMessage + emoji)
    setShowEmojis(false)
  }

  const getAiSuggestions = async () => {
    if (messages.length === 0) {
      alert('Start a conversation first to get AI suggestions')
      return
    }

    setLoadingSuggestions(true)
    setShowAiSuggestions(true)

    try {
      const token = localStorage.getItem('token')

      // Get conversation context
      const conversationHistory = messages.slice(-3).map(msg => ({
        role: msg.direction === 'outbound' ? 'user' : 'assistant',
        content: msg.body
      }))

      const response = await axios.post(
        `${API_URL}/api/test-ai/suggestions`,
        {
          conversationHistory: conversationHistory
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      setAiSuggestions(response.data.suggestions || [
        "That sounds great! Tell me more.",
        "I'm interested. What's the next step?",
        "Can we schedule a time to discuss this?"
      ])
    } catch (error) {
      console.error('Failed to get AI suggestions:', error)
      // Fallback suggestions
      setAiSuggestions([
        "That sounds great! Tell me more.",
        "I'm interested. What's the next step?",
        "Can we schedule a time to discuss this?"
      ])
    } finally {
      setLoadingSuggestions(false)
    }
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
                    <div className="conversation-strategy-badge">
                      🎯 {conv.lead_name}
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
                    <span className="locked-strategy-badge">
                      🔒 Using: {selectedConversation.lead_name} Strategy
                    </span>
                    {conversationId && (
                      <>
                        <span style={{ margin: '0 8px', color: '#475569' }}>•</span>
                        <span className="conversation-id">
                          ID: {conversationId.substring(0, 8)}...
                        </span>
                      </>
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

                      {/* Workflow Execution Indicator */}
                      {message.workflow_executed && (
                        <div className="workflow-execution-card">
                          <div className="workflow-header">
                            <span className="workflow-icon">🔄</span>
                            <span className="workflow-title">Workflow Executed: {message.workflow_executed.name}</span>
                          </div>
                          <div className="workflow-actions">
                            {message.workflow_executed.actions && message.workflow_executed.actions.map((action, idx) => (
                              <div key={idx} className="workflow-action-item">
                                <span className="action-icon">✅</span>
                                <span className="action-label">{action.label}</span>
                              </div>
                            ))}
                          </div>
                          {message.workflow_executed.result && (
                            <div className="workflow-result">
                              <span className="result-icon">📋</span>
                              <span className="result-text">{message.workflow_executed.result}</span>
                            </div>
                          )}
                        </div>
                      )}
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
                  <button
                    className="toolbar-btn"
                    title="Templates"
                    onClick={() => {
                      setShowTemplates(!showTemplates)
                      setShowEmojis(false)
                      setShowAiSuggestions(false)
                    }}
                  >
                    📄
                  </button>
                  <button
                    className="toolbar-btn"
                    title="AI Suggestions"
                    onClick={() => {
                      getAiSuggestions()
                      setShowTemplates(false)
                      setShowEmojis(false)
                    }}
                  >
                    ✨
                  </button>
                  <button
                    className="toolbar-btn"
                    title="Emoji"
                    onClick={() => {
                      setShowEmojis(!showEmojis)
                      setShowTemplates(false)
                      setShowAiSuggestions(false)
                    }}
                  >
                    😊
                  </button>
                </div>

                {/* Templates Popup */}
                {showTemplates && (
                  <div className="toolbar-popup">
                    <div className="popup-header">
                      <h4>Message Templates</h4>
                      <button className="close-popup" onClick={() => setShowTemplates(false)}>✕</button>
                    </div>
                    <div className="popup-content">
                      {MESSAGE_TEMPLATES.map(template => (
                        <button
                          key={template.id}
                          className="template-item"
                          onClick={() => insertTemplate(template.text)}
                        >
                          <span className="template-label">{template.label}</span>
                          <span className="template-text">{template.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Suggestions Popup */}
                {showAiSuggestions && (
                  <div className="toolbar-popup">
                    <div className="popup-header">
                      <h4>AI Suggestions</h4>
                      <button className="close-popup" onClick={() => setShowAiSuggestions(false)}>✕</button>
                    </div>
                    <div className="popup-content">
                      {loadingSuggestions ? (
                        <div className="loading-suggestions">Generating suggestions...</div>
                      ) : (
                        aiSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            className="template-item"
                            onClick={() => {
                              setNewMessage(suggestion)
                              setShowAiSuggestions(false)
                            }}
                          >
                            <span className="template-text">{suggestion}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Emoji Popup */}
                {showEmojis && (
                  <div className="toolbar-popup emoji-popup">
                    <div className="popup-header">
                      <h4>Emojis</h4>
                      <button className="close-popup" onClick={() => setShowEmojis(false)}>✕</button>
                    </div>
                    <div className="popup-content emoji-grid">
                      {EMOJI_LIST.map((emoji, index) => (
                        <button
                          key={index}
                          className="emoji-item"
                          onClick={() => insertEmoji(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>End Conversation</h3>
              <button className="modal-close" onClick={cancelDelete}>✕</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to end this test conversation?</p>
              <p className="modal-subtitle">
                This will delete the conversation: <strong>{conversationToDelete?.lead_name}</strong>
              </p>
            </div>
            <div className="modal-footer">
              <button className="modal-btn cancel-btn" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="modal-btn delete-btn" onClick={confirmDelete}>
                End Conversation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TestAI
