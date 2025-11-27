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
} from 'reactflow'
import 'reactflow/dist/style.css'
import '../styles/WorkflowBuilder.css'

// Custom Node Types
const TriggerNode = ({ data }) => (
  <div className="custom-node trigger-node">
    <div className="node-icon">⚡</div>
    <div className="node-content">
      <div className="node-title">{data.label}</div>
      <div className="node-subtitle">Trigger</div>
    </div>
  </div>
)

const ActionNode = ({ data }) => (
  <div className="custom-node action-node">
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
  </div>
)

const LogicNode = ({ data }) => (
  <div className="custom-node logic-node">
    <div className="node-icon">{data.icon}</div>
    <div className="node-content">
      <div className="node-title">{data.label}</div>
      <div className="node-subtitle">Logic</div>
    </div>
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

  // Initialize with trigger node if empty
  useEffect(() => {
    if (nodes.length === 0 && !initialWorkflow) {
      const triggerNode = {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 400, y: 100 },
        data: {
          label: 'Lead Created',
          type: 'trigger',
        },
      }
      setNodes([triggerNode])
    } else if (initialWorkflow) {
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
          {searchQuery && filteredUniversalTasks.length === 0 && filteredGhlTasks.length === 0 && filteredLogic.length === 0 && (
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
                  value={selectedNode.data.label}
                  onChange={(e) => {
                    setNodes((nds) =>
                      nds.map((node) =>
                        node.id === selectedNode.id
                          ? {
                              ...node,
                              data: { ...node.data, label: e.target.value },
                            }
                          : node
                      )
                    )
                  }}
                  className="property-input"
                />
              </div>
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
                  <div className="property-group">
                    <label>Description</label>
                    <textarea
                      value={selectedNode.data.description || ''}
                      onChange={(e) => {
                        setNodes((nds) =>
                          nds.map((node) =>
                            node.id === selectedNode.id
                              ? {
                                  ...node,
                                  data: {
                                    ...node.data,
                                    description: e.target.value,
                                  },
                                }
                              : node
                          )
                        )
                      }}
                      className="property-textarea"
                      rows={3}
                    />
                  </div>
                </>
              )}
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
