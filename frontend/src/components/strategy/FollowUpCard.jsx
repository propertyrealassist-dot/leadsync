import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import '../../styles/strategy.css';

/**
 * FollowUpCard - Follow-up message card with time delay
 *
 * Props:
 * - id: Unique identifier
 * - index: Follow-up index
 * - message: Follow-up message text
 * - delay: Delay in hours
 * - onUpdate: Callback when updated
 * - onDelete: Callback when deleted
 */
const FollowUpCard = ({
  id,
  index,
  message,
  delay,
  onUpdate,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMessage, setEditedMessage] = useState(message);
  const [editedDelay, setEditedDelay] = useState(delay);

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
    if (editedMessage.trim()) {
      onUpdate(id, { message: editedMessage, delay: editedDelay });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedMessage(message);
    setEditedDelay(delay);
    setIsEditing(false);
  };

  return (
    <div ref={setNodeRef} style={style} className="question-card strategy-fade-in">
      <div className="strategy-drag-handle" {...attributes} {...listeners}>
        ⋮⋮
      </div>

      <div className="question-card-content">
        <div className="question-card-header">
          <span className="question-card-label">Follow-up {index}</span>
          <div className="question-card-actions">
            {!isEditing ? (
              <>
                <button
                  className="strategy-btn strategy-btn-ghost strategy-btn-sm"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </button>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ marginBottom: '12px' }}>
              <label className="strategy-label">Delay (hours)</label>
              <input
                type="number"
                className="strategy-input"
                value={editedDelay}
                onChange={(e) => setEditedDelay(Number(e.target.value))}
                min="0"
                step="0.5"
              />
            </div>
            <textarea
              className="strategy-textarea"
              value={editedMessage}
              onChange={(e) => setEditedMessage(e.target.value)}
              onBlur={handleSave}
              autoFocus
              rows={3}
              placeholder="Enter follow-up message..."
            />
          </motion.div>
        ) : (
          <>
            <div className="question-card-text" onClick={() => setIsEditing(true)}>
              {message}
            </div>
            <div className="question-card-meta">
              <span>⏱ {delay} hours</span>
              <span>📝 Click to edit</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FollowUpCard;
