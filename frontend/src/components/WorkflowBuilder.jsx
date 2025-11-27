import { useState, useCallback, useRef, useEffect } from 'react'
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  MarkerType,
  Handle,
  Position,
} from 'reactflow'
import 'reactflow/dist/style.css'
import '../styles/WorkflowBuilder.css'

// Custom Node Types with connection handles
const TriggerNode = ({ data }) => (
  <div className="custom-node trigger-node">
    <div className="node-icon">{data.icon || '⚡'}</div>
    <div className="node-content">
      <div className="node-title">{data.label}</div>
      <div className="node-subtitle">Trigger</div>
    </div>
    <Handle type="source" position={Position.Bottom} />
  </div>
)

const ActionNode = ({ data }) => (
  <div className="custom-node action-node">
    <Handle type="target" position={Position.Top} />
    <div className="node-icon">{data.icon}</div>
    <div className="node-content">
      <div className="node-title">{data.label}</div>
      <div className="node-subtitle">{data.type}</div>
    </div>
    {data.description && (
      <div className="node-description">{data.description}</div>
    )}
    {data.ghlIntegration && (
      <div className="ghl-badge">GHL</div>
    )}
    <Handle type="source" position={Position.Bottom} />
  </div>
)

const LogicNode = ({ data }) => (
  <div className="custom-node logic-node">
    <Handle type="target" position={Position.Top} />
    <div className="node-icon">{data.icon}</div>
    <div className="node-content">
      <div className="node-title">{data.label}</div>
      <div className="node-subtitle">Logic</div>
    </div>
    <Handle type="source" position={Position.Bottom} id="true" style={{ left: '30%' }} />
    <Handle type="source" position={Position.Bottom} id="false" style={{ left: '70%' }} />
  </div>
)

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  logic: LogicNode,
}

function WorkflowBuilder({ onSave, initialWorkflow }) {
  const reactFlowWrapper = useRef(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [reactFlowInstance, setReactFlowInstance] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [showActionPanel, setShowActionPanel] = useState(false)
  const [workflowName, setWorkflowName] = useState('New Workflow')
  const [searchQuery, setSearchQuery] = useState('')

  // Available Triggers
  const availableTriggers = [
    {
      id: 'lead-created',
      label: 'Lead Created',
      icon: '⚡',
      type: 'Trigger',
      nodeType: 'trigger',
      description: 'When a new lead is added to the system'
    },
    {
      id: 'message-received',
      label: 'Message Received',
      icon: '💬',
      type: 'Trigger',
      nodeType: 'trigger',
      description: 'When a contact sends a message'
    },
    {
      id: 'booking-confirmed',
      label: 'Booking Confirmed',
      icon: '✅',
      type: 'Trigger',
      nodeType: 'trigger',
      description: 'When a booking is confirmed'
    },
    {
      id: 'tag-added',
      label: 'Tag Added',
      icon: '🏷️',
      type: 'Trigger',
      nodeType: 'trigger',
      description: 'When a specific tag is added to contact'
    },
    {
      id: 'form-submitted',
      label: 'Form Submitted',
      icon: '📝',
      type: 'Trigger',
      nodeType: 'trigger',
      description: 'When a contact submits a form'
    },
    {
      id: 'keyword-detected',
      label: 'Keyword Detected',
      icon: '🔍',
      type: 'Trigger',
      nodeType: 'trigger',
      description: 'When specific keywords are detected in messages'
    },
  ]

  // Universal Tasks
  const universalTasks = [
    {
      id: 'handle-booking',
      label: 'Handle Booking',
      icon: '📅',
      type: 'Universal',
      category: 'UNIVERSAL TASKS',
      nodeType: 'action',
      description: 'Handles booking when agreed time is provided',
      ghlIntegration: true
    },
    {
      id: 'turn-off-ai',
      label: 'Turn Off AI',
      icon: '🤖',
      type: 'Universal',
      category: 'UNIVERSAL TASKS',
      nodeType: 'action',
      description: 'Disable AI automation for contact',
      ghlIntegration: false
    },
    {
      id: 'turn-off-followups',
      label: 'Turn Off Follow-ups',
      icon: '💤',
      type: 'Universal',
      category: 'UNIVERSAL TASKS',
      nodeType: 'action',
      description: 'Keep AI active but disable follow-up messages',
      ghlIntegration: false
    },
    {
      id: 'generate-summary',
      label: 'Generate Summary',
      icon: '📝',
      type: 'Universal',
      category: 'UNIVERSAL TASKS',
      nodeType: 'action',
      description: 'Create AI-powered summaries from content',
      ghlIntegration: false
    },
    {
      id: 'ask-ai',
      label: 'Ask AI',
      icon: '✨',
      type: 'Universal',
      category: 'UNIVERSAL TASKS',
      nodeType: 'action',
      description: 'Use AI to process data and generate responses',
      ghlIntegration: false
    },
    {
      id: 'update-agent',
      label: 'Update Agent',
      icon: '👤',
      type: 'Universal',
      category: 'UNIVERSAL TASKS',
      nodeType: 'action',
      description: 'Assign or update the agent/strategy for this contact',
      ghlIntegration: true
    },
    {
      id: 'update-calendar',
      label: 'Update Calendar',
      icon: '📆',
      type: 'Universal',
      category: 'UNIVERSAL TASKS',
      nodeType: 'action',
      description: 'Set the calendar provider and calendar to use for bookings',
      ghlIntegration: true
    },
  ]

  // GHL Tasks
  const ghlTasks = [
    {
      id: 'update-custom-field',
      label: 'Update Custom Field',
      icon: '🔧',
      type: 'GHL',
      category: 'GHL TASKS',
      nodeType: 'action',
      description: 'Modify custom fields on contact records',
      ghlIntegration: true
    },
    {
      id: 'update-standard-field',
      label: 'Update Standard Field',
      icon: '📋',
      type: 'GHL',
      category: 'GHL TASKS',
      nodeType: 'action',
      description: 'Update standard contact information',
      ghlIntegration: true
    },
    {
      id: 'add-tags',
      label: 'Add Tags',
      icon: '🏷️',
      type: 'GHL',
      category: 'GHL TASKS',
      nodeType: 'action',
      description: 'Apply tags to organize contacts',
      ghlIntegration: true
    },
  ]

  const availableLogic = [
    {
      id: 'if-then',
      label: 'If/Then',
      icon: '🔀',
      type: 'Conditional',
      nodeType: 'logic',
      description: 'Branch logic'
    },
    {
      id: 'delay',
      label: 'Delay',
      icon: '⏱️',
      type: 'Timing',
      nodeType: 'logic',
      description: 'Wait period'
    },
    {
      id: 'filter',
      label: 'Filter',
      icon: '🎯',
      type: 'Conditional',
      nodeType: 'logic',
      description: 'Filter contacts'
    },
  ]

  // Filter tasks based on search
  const filteredTriggers = availableTriggers.filter(trigger =>
    trigger.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trigger.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredUniversalTasks = universalTasks.filter(task =>
    task.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredGhlTasks = ghlTasks.filter(task =>
    task.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredLogic = availableLogic.filter(logic =>
    logic.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    logic.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Load initial workflow if provided
  useEffect(() => {
    if (initialWorkflow) {
      setNodes(initialWorkflow.nodes || [])
      setEdges(initialWorkflow.edges || [])
      setWorkflowName(initialWorkflow.name || 'New Workflow')
    }
  }, [initialWorkflow])

  const onConnect = useCallback(
    (params) => {
      const newEdge = {
        ...params,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#8b5cf6', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#8b5cf6',
        },
      }
      setEdges((eds) => addEdge(newEdge, eds))
    },
    [setEdges]
  )

  const onDragOver = useCallback((event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event) => {
      event.preventDefault()

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
      const actionData = JSON.parse(
        event.dataTransfer.getData('application/reactflow')
      )

      if (!actionData) return

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      })

      const newNode = {
        id: `${actionData.id}-${Date.now()}`,
        type: actionData.nodeType,
        position,
        data: {
          ...actionData,
        },
      }

      setNodes((nds) => nds.concat(newNode))
    },
    [reactFlowInstance, setNodes]
  )

  const onDragStart = (event, action) => {
    event.dataTransfer.setData(
      'application/reactflow',
      JSON.stringify(action)
    )
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleSaveWorkflow = () => {
    const workflow = {
      name: workflowName,
      nodes: nodes,
      edges: edges,
      createdAt: new Date().toISOString(),
    }

    if (onSave) {
      onSave(workflow)
    }

    console.log('Workflow saved:', workflow)
  }

  const handleTestWorkflow = () => {
    console.log('Testing workflow with:', { nodes, edges })
    alert('Workflow test initiated! Check console for details.')
  }

  const deleteNode = (nodeId) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId))
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))
    setSelectedNode(null)
  }

  const onNodeClick = (event, node) => {
    setSelectedNode(node)
    setShowActionPanel(true)
  }

  const updateNodeData = (field, value) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedNode.id
          ? {
              ...node,
              data: { ...node.data, [field]: value },
            }
          : node
      )
    )
  }

  const renderNodeConfiguration = () => {
    if (!selectedNode) return null

    const baseId = selectedNode.id.split('-')[0]

    return (
      <>
        {/* Common Fields */}
        <div className="property-group">
          <label>Node Type</label>
          <div className="property-value">
            {selectedNode.data.icon} {selectedNode.data.type}
          </div>
        </div>
        <div className="property-group">
          <label>Label</label>
          <input
            type="text"
            value={selectedNode.data.label || ''}
            onChange={(e) => updateNodeData('label', e.target.value)}
            className="property-input"
          />
        </div>

        {/* Trigger-Specific Configuration */}
        {selectedNode.type === 'trigger' && (
          <>
            {baseId === 'keyword' && (
              <div className="property-group">
                <label>Keywords (comma-separated)</label>
                <input
                  type="text"
                  value={selectedNode.data.keywords || ''}
                  onChange={(e) => updateNodeData('keywords', e.target.value)}
                  className="property-input"
                  placeholder="e.g., pricing, schedule, demo"
                />
              </div>
            )}
            {baseId === 'tag' && (
              <div className="property-group">
                <label>Tag Name</label>
                <input
                  type="text"
                  value={selectedNode.data.tagName || ''}
                  onChange={(e) => updateNodeData('tagName', e.target.value)}
                  className="property-input"
                  placeholder="Enter tag name"
                />
              </div>
            )}
          </>
        )}

        {/* Action-Specific Configuration */}
        {selectedNode.type === 'action' && (
          <>
            {selectedNode.data.ghlIntegration && (
              <div className="ghl-integration-notice">
                <div className="ghl-integration-notice-icon">🔗</div>
                <div className="ghl-integration-notice-content">
                  <div className="ghl-integration-notice-title">GHL Integration</div>
                  <div className="ghl-integration-notice-text">
                    This task integrates with GoHighLevel CRM and requires proper API configuration.
                  </div>
                </div>
              </div>
            )}

            {/* Handle Booking */}
            {baseId === 'handle' && (
              <>
                <div className="property-group">
                  <label>Calendar Provider</label>
                  <select
                    value={selectedNode.data.calendarProvider || 'ghl'}
                    onChange={(e) => updateNodeData('calendarProvider', e.target.value)}
                    className="property-input"
                  >
                    <option value="ghl">GoHighLevel</option>
                    <option value="google">Google Calendar</option>
                    <option value="outlook">Outlook</option>
                  </select>
                </div>
                <div className="property-group">
                  <label>Calendar ID</label>
                  <input
                    type="text"
                    value={selectedNode.data.calendarId || ''}
                    onChange={(e) => updateNodeData('calendarId', e.target.value)}
                    className="property-input"
                    placeholder="Enter calendar ID"
                  />
                </div>
              </>
            )}

            {/* Update Custom Field */}
            {baseId === 'update' && selectedNode.data.id?.includes('custom') && (
              <>
                <div className="property-group">
                  <label>Field Name</label>
                  <input
                    type="text"
                    value={selectedNode.data.fieldName || ''}
                    onChange={(e) => updateNodeData('fieldName', e.target.value)}
                    className="property-input"
                    placeholder="Custom field name"
                  />
                </div>
                <div className="property-group">
                  <label>Field Value</label>
                  <input
                    type="text"
                    value={selectedNode.data.fieldValue || ''}
                    onChange={(e) => updateNodeData('fieldValue', e.target.value)}
                    className="property-input"
                    placeholder="Value to set"
                  />
                </div>
              </>
            )}

            {/* Update Standard Field */}
            {baseId === 'update' && selectedNode.data.id?.includes('standard') && (
              <>
                <div className="property-group">
                  <label>Field Name</label>
                  <select
                    value={selectedNode.data.fieldName || ''}
                    onChange={(e) => updateNodeData('fieldName', e.target.value)}
                    className="property-input"
                  >
                    <option value="">Select field</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="firstName">First Name</option>
                    <option value="lastName">Last Name</option>
                    <option value="company">Company</option>
                    <option value="address">Address</option>
                  </select>
                </div>
                <div className="property-group">
                  <label>Field Value</label>
                  <input
                    type="text"
                    value={selectedNode.data.fieldValue || ''}
                    onChange={(e) => updateNodeData('fieldValue', e.target.value)}
                    className="property-input"
                    placeholder="Value to set"
                  />
                </div>
              </>
            )}

            {/* Add Tags */}
            {baseId === 'add' && selectedNode.data.id?.includes('tags') && (
              <div className="property-group">
                <label>Tags (comma-separated)</label>
                <input
                  type="text"
                  value={selectedNode.data.tags || ''}
                  onChange={(e) => updateNodeData('tags', e.target.value)}
                  className="property-input"
                  placeholder="e.g., qualified, interested, hot-lead"
                />
              </div>
            )}

            {/* Ask AI */}
            {baseId === 'ask' && (
              <div className="property-group">
                <label>AI Prompt</label>
                <textarea
                  value={selectedNode.data.aiPrompt || ''}
                  onChange={(e) => updateNodeData('aiPrompt', e.target.value)}
                  className="property-textarea"
                  rows={4}
                  placeholder="Enter the question or task for AI..."
                />
              </div>
            )}

            {/* Generate Summary */}
            {baseId === 'generate' && (
              <div className="property-group">
                <label>Summary Type</label>
                <select
                  value={selectedNode.data.summaryType || 'conversation'}
                  onChange={(e) => updateNodeData('summaryType', e.target.value)}
                  className="property-input"
                >
                  <option value="conversation">Conversation Summary</option>
                  <option value="lead">Lead Summary</option>
                  <option value="interaction">Interaction Summary</option>
                </select>
              </div>
            )}

            {/* Update Agent */}
            {selectedNode.data.id?.includes('agent') && (
              <div className="property-group">
                <label>Strategy/Agent</label>
                <input
                  type="text"
                  value={selectedNode.data.strategyId || ''}
                  onChange={(e) => updateNodeData('strategyId', e.target.value)}
                  className="property-input"
                  placeholder="Strategy ID or name"
                />
              </div>
            )}

            {/* Update Calendar */}
            {selectedNode.data.id?.includes('calendar') && (
              <>
                <div className="property-group">
                  <label>Calendar Provider</label>
                  <select
                    value={selectedNode.data.calendarProvider || 'ghl'}
                    onChange={(e) => updateNodeData('calendarProvider', e.target.value)}
                    className="property-input"
                  >
                    <option value="ghl">GoHighLevel</option>
                    <option value="google">Google Calendar</option>
                    <option value="outlook">Outlook</option>
                  </select>
                </div>
                <div className="property-group">
                  <label>Calendar ID</label>
                  <input
                    type="text"
                    value={selectedNode.data.calendarId || ''}
                    onChange={(e) => updateNodeData('calendarId', e.target.value)}
                    className="property-input"
                    placeholder="Enter calendar ID"
                  />
                </div>
              </>
            )}

            <div className="property-group">
              <label>Description</label>
              <textarea
                value={selectedNode.data.description || ''}
                onChange={(e) => updateNodeData('description', e.target.value)}
                className="property-textarea"
                rows={3}
                placeholder="Optional notes..."
              />
            </div>
          </>
        )}

        {/* Logic-Specific Configuration */}
        {selectedNode.type === 'logic' && (
          <>
            {baseId === 'if' && (
              <>
                <div className="property-group">
                  <label>Condition Type</label>
                  <select
                    value={selectedNode.data.conditionType || 'contains'}
                    onChange={(e) => updateNodeData('conditionType', e.target.value)}
                    className="property-input"
                  >
                    <option value="contains">Contains Keyword</option>
                    <option value="equals">Equals</option>
                    <option value="greater">Greater Than</option>
                    <option value="less">Less Than</option>
                    <option value="hasTag">Has Tag</option>
                  </select>
                </div>
                <div className="property-group">
                  <label>Condition Value</label>
                  <input
                    type="text"
                    value={selectedNode.data.conditionValue || ''}
                    onChange={(e) => updateNodeData('conditionValue', e.target.value)}
                    className="property-input"
                    placeholder="Enter value to check"
                  />
                </div>
              </>
            )}
            {baseId === 'delay' && (
              <>
                <div className="property-group">
                  <label>Delay Amount</label>
                  <input
                    type="number"
                    value={selectedNode.data.delayAmount || '1'}
                    onChange={(e) => updateNodeData('delayAmount', e.target.value)}
                    className="property-input"
                    min="1"
                  />
                </div>
                <div className="property-group">
                  <label>Time Unit</label>
                  <select
                    value={selectedNode.data.delayUnit || 'minutes'}
                    onChange={(e) => updateNodeData('delayUnit', e.target.value)}
                    className="property-input"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              </>
            )}
            {baseId === 'filter' && (
              <>
                <div className="property-group">
                  <label>Filter Type</label>
                  <select
                    value={selectedNode.data.filterType || 'tag'}
                    onChange={(e) => updateNodeData('filterType', e.target.value)}
                    className="property-input"
                  >
                    <option value="tag">Has Tag</option>
                    <option value="field">Field Value</option>
                    <option value="score">Lead Score</option>
                  </select>
                </div>
                <div className="property-group">
                  <label>Filter Value</label>
                  <input
                    type="text"
                    value={selectedNode.data.filterValue || ''}
                    onChange={(e) => updateNodeData('filterValue', e.target.value)}
                    className="property-input"
                    placeholder="Enter filter criteria"
                  />
                </div>
              </>
            )}
          </>
        )}
      </>
    )
  }

  return (
    <div className="workflow-builder">
      {/* Header */}
      <div className="workflow-header">
        <div className="workflow-header-left">
          <input
            type="text"
            className="workflow-name-input"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder="Workflow name..."
          />
          <span className="workflow-stats">
            Nodes: {nodes.length} | Connections: {edges.length}
          </span>
        </div>
        <div className="workflow-header-right">
          <button className="workflow-btn secondary" onClick={handleTestWorkflow}>
            ⚡ Test Workflow
          </button>
          <button className="workflow-btn primary" onClick={handleSaveWorkflow}>
            💾 Save Workflow
          </button>
        </div>
      </div>

      <div className="workflow-container">
        {/* Sidebar */}
        <div className="workflow-sidebar">
          <h3 className="sidebar-title">Add New Task</h3>

          {/* Search */}
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="search-icon">🔍</span>
          </div>

          {/* Triggers Section */}
          {filteredTriggers.length > 0 && (
            <div className="sidebar-section">
              <h4 className="section-title">⚡ TRIGGERS</h4>
              {filteredTriggers.map((trigger) => (
                <div
                  key={trigger.id}
                  className="sidebar-item trigger-item"
                  draggable
                  onDragStart={(e) => onDragStart(e, trigger)}
                >
                  <div className="sidebar-item-icon">{trigger.icon}</div>
                  <div className="sidebar-item-content">
                    <div className="sidebar-item-label">{trigger.label}</div>
                    <div className="sidebar-item-type">{trigger.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Universal Tasks Section */}
          {filteredUniversalTasks.length > 0 && (
            <div className="sidebar-section">
              <h4 className="section-title">UNIVERSAL TASKS</h4>
              {filteredUniversalTasks.map((task) => (
                <div
                  key={task.id}
                  className="sidebar-item action-item"
                  draggable
                  onDragStart={(e) => onDragStart(e, task)}
                >
                  <div className="sidebar-item-icon">{task.icon}</div>
                  <div className="sidebar-item-content">
                    <div className="sidebar-item-label">{task.label}</div>
                    <div className="sidebar-item-type">{task.description}</div>
                  </div>
                  {task.ghlIntegration && (
                    <div className="ghl-mini-badge">GHL</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* GHL Tasks Section */}
          {filteredGhlTasks.length > 0 && (
            <div className="sidebar-section">
              <h4 className="section-title">GHL TASKS</h4>
              {filteredGhlTasks.map((task) => (
                <div
                  key={task.id}
                  className="sidebar-item ghl-item"
                  draggable
                  onDragStart={(e) => onDragStart(e, task)}
                >
                  <div className="sidebar-item-icon">{task.icon}</div>
                  <div className="sidebar-item-content">
                    <div className="sidebar-item-label">{task.label}</div>
                    <div className="sidebar-item-type">{task.description}</div>
                  </div>
                  <div className="ghl-mini-badge">GHL</div>
                </div>
              ))}
            </div>
          )}

          {/* Logic Section */}
          {filteredLogic.length > 0 && (
            <div className="sidebar-section">
              <h4 className="section-title">🎯 LOGIC</h4>
              {filteredLogic.map((logic) => (
                <div
                  key={logic.id}
                  className="sidebar-item logic-item"
                  draggable
                  onDragStart={(e) => onDragStart(e, logic)}
                >
                  <div className="sidebar-item-icon">{logic.icon}</div>
                  <div className="sidebar-item-content">
                    <div className="sidebar-item-label">{logic.label}</div>
                    <div className="sidebar-item-type">{logic.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {searchQuery && filteredTriggers.length === 0 && filteredUniversalTasks.length === 0 && filteredGhlTasks.length === 0 && filteredLogic.length === 0 && (
            <div className="no-results">
              <span className="no-results-icon">🔍</span>
              <p>No tasks found</p>
              <p className="no-results-hint">Try a different search term</p>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div className="workflow-canvas" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Background
              variant="dots"
              gap={20}
              size={1}
              color="#8b5cf6"
              style={{ opacity: 0.2 }}
            />
            <Controls
              style={{
                button: {
                  background: 'rgba(139, 92, 246, 0.1)',
                  borderColor: 'rgba(139, 92, 246, 0.3)',
                  color: '#e2e8f0',
                },
              }}
            />
            <MiniMap
              nodeColor={(node) => {
                switch (node.type) {
                  case 'trigger':
                    return '#ec4899'
                  case 'action':
                    return '#8b5cf6'
                  case 'logic':
                    return '#6366f1'
                  default:
                    return '#94a3b8'
                }
              }}
              maskColor="rgba(26, 29, 46, 0.8)"
              style={{
                background: 'rgba(26, 29, 46, 0.6)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
              }}
            />
          </ReactFlow>
        </div>

        {/* Properties Panel */}
        {showActionPanel && selectedNode && (
          <div className="properties-panel">
            <div className="properties-header">
              <h3>Node Properties</h3>
              <button
                className="close-btn"
                onClick={() => setShowActionPanel(false)}
              >
                ✕
              </button>
            </div>
            <div className="properties-content">
              {renderNodeConfiguration()}
              <div className="property-actions">
                <button
                  className="delete-node-btn"
                  onClick={() => deleteNode(selectedNode.id)}
                >
                  🗑️ Delete Node
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Wrapper with ReactFlowProvider
export default function WorkflowBuilderWrapper(props) {
  return (
    <ReactFlowProvider>
      <WorkflowBuilder {...props} />
    </ReactFlowProvider>
  )
}
