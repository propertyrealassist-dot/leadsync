import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import '../../styles/strategy.css';

/**
 * QuestionCard - Drag-and-drop question card with inline editing
 *
 * Props:
 * - id: Unique identifier
 * - index: Question index (1-based for display)
 * - question: Question text
 * - onUpdate: Callback when question is updated
 * - onDelete: Callback when question is deleted
 * - onAddCondition: Callback to add condition
 * - dragHandle: Whether to show drag handle (default: true)
 */
const QuestionCard = ({
  id,
  index,
  question,
  onUpdate,
  onDelete,
  onAddCondition,
  dragHandle = true
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState(question);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const handleSave = () => {
    if (editedQuestion.trim() && editedQuestion !== question) {
      onUpdate(id, editedQuestion);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedQuestion(question);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="question-card strategy-fade-in"
    >
      {dragHandle && (
        <div
          className="strategy-drag-handle"
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </div>
      )}

      <div className="question-card-content">
        <div className="question-card-header">
          <span className="question-card-label">Q{index}</span>
          <div className="question-card-actions">
            {!isEditing ? (
              <>
                <button
                  className="strategy-btn strategy-btn-ghost strategy-btn-sm"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </button>
                {onAddCondition && (
                  <button
                    className="strategy-btn strategy-btn-ghost strategy-btn-sm"
                    onClick={() => onAddCondition(id)}
                  >
                    + Condition
                  </button>
                )}
                <button
                  className="strategy-btn strategy-btn-danger strategy-btn-sm"
                  onClick={() => onDelete(id)}
                >
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  className="strategy-btn strategy-btn-primary strategy-btn-sm"
                  onClick={handleSave}
                >
                  Save
                </button>
                <button
                  className="strategy-btn strategy-btn-ghost strategy-btn-sm"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <motion.textarea
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="strategy-textarea"
            value={editedQuestion}
            onChange={(e) => setEditedQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            autoFocus
            rows={2}
            placeholder="Enter your qualification question..."
            style={{ marginTop: '8px' }}
          />
        ) : (
          <div
            className="question-card-text"
            onClick={() => setIsEditing(true)}
            style={{ cursor: 'text' }}
          >
            {question}
          </div>
        )}

        {!isEditing && (
          <div className="question-card-meta">
            <span>📝 Click to edit</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionCard;
