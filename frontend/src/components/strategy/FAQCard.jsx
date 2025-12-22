import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import '../../styles/strategy.css';

/**
 * FAQCard - FAQ item card with drag-and-drop
 *
 * Props:
 * - id: Unique identifier
 * - question: FAQ question
 * - answer: FAQ answer
 * - delay: Response delay in seconds
 * - onUpdate: Callback when updated
 * - onDelete: Callback when deleted
 */
const FAQCard = ({
  id,
  question,
  answer,
  delay = 1,
  onUpdate,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState(question);
  const [editedAnswer, setEditedAnswer] = useState(answer);
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
    if (editedQuestion.trim() && editedAnswer.trim()) {
      onUpdate(id, {
        question: editedQuestion,
        answer: editedAnswer,
        delay: editedDelay
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedQuestion(question);
    setEditedAnswer(answer);
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
          <span
            className="question-card-label"
            onClick={() => !isEditing && setIsExpanded(!isExpanded)}
            style={{ cursor: 'pointer' }}
          >
            {isExpanded ? '▼' : '▶'} FAQ
          </span>
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
              <label className="strategy-label">Question</label>
              <input
                className="strategy-input"
                value={editedQuestion}
                onChange={(e) => setEditedQuestion(e.target.value)}
                placeholder="Enter FAQ question..."
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label className="strategy-label">Answer</label>
              <textarea
                className="strategy-textarea"
                value={editedAnswer}
                onChange={(e) => setEditedAnswer(e.target.value)}
                rows={3}
                placeholder="Enter answer..."
              />
            </div>
            <div>
              <label className="strategy-label">Delay (seconds)</label>
              <input
                type="number"
                className="strategy-input"
                value={editedDelay}
                onChange={(e) => setEditedDelay(Number(e.target.value))}
                min="0"
                step="0.5"
              />
            </div>
          </motion.div>
        ) : (
          <>
            <div
              className="question-card-text"
              onClick={() => setIsExpanded(!isExpanded)}
              style={{ cursor: 'pointer', fontWeight: 600 }}
            >
              {question}
            </div>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={{
                  marginTop: '8px',
                  fontSize: '0.875rem',
                  color: 'var(--strategy-text-secondary)',
                  lineHeight: 1.6
                }}
              >
                {answer}
              </motion.div>
            )}
            <div className="question-card-meta">
              <span>⏱ {delay}s delay</span>
              <span>📝 Click to edit</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FAQCard;
