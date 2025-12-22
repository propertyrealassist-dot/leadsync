import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import '../../styles/design-system.css';

/**
 * FollowUpCard - Follow-up message card with delay settings (Pixel-Perfect Design)
 *
 * Props:
 * - id: Unique ID for drag-and-drop
 * - index: Display index (F1, F2, etc.)
 * - message: Follow-up message text
 * - delay: Delay in hours
 * - onUpdate: Update callback (id, { message, delay })
 * - onDelete: Delete callback (id)
 */
const FollowUpCard = ({ id, index, message, delay, onUpdate, onDelete }) => {
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
    opacity: isDragging ? 0.5 : 1,
    marginBottom: 'var(--space-lg)'
  };

  const handleSave = () => {
    if (editedMessage.trim()) {
      onUpdate(id, { message: editedMessage, delay: editedDelay });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditedMessage(message);
      setEditedDelay(delay);
      setIsEditing(false);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="ds-followup-card ds-fade-in">
      {/* Drag Handle */}
      <div className="ds-drag-handle" {...attributes} {...listeners}>
        ⋮⋮
      </div>

      {/* Follow-up Label (F1, F2, etc.) */}
      <div className="ds-followup-label">F{index}</div>

      {/* Content */}
      <div className="ds-followup-content">
        {isEditing ? (
          <>
            <textarea
              value={editedMessage}
              onChange={(e) => setEditedMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="ds-input ds-textarea"
              style={{ marginBottom: 'var(--space-md)' }}
              autoFocus
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-tertiary)' }}>
                Delay:
              </span>
              <input
                type="number"
                value={editedDelay}
                onChange={(e) => setEditedDelay(parseInt(e.target.value) || 0)}
                className="ds-input"
                style={{ width: '80px' }}
                min="0"
              />
              <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-tertiary)' }}>
                hours
              </span>
            </div>
          </>
        ) : (
          <>
            <div
              className="ds-followup-text"
              onClick={() => setIsEditing(true)}
              style={{ cursor: 'pointer' }}
            >
              {message}
            </div>
            <div className="ds-followup-delay">
              ⏱️ {delay} hour{delay !== 1 ? 's' : ''} after last message
            </div>
          </>
        )}
      </div>

      {/* Delete Button */}
      <button
        onClick={() => onDelete(id)}
        className="ds-btn-ghost"
        style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}
        title="Delete"
      >
        ×
      </button>
    </div>
  );
};

export default FollowUpCard;
