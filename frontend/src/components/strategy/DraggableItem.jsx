import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import '../../styles/design-system.css';

/**
 * DraggableItem - Reusable draggable list item with drag handle
 *
 * Props:
 * - id: Unique ID for drag-and-drop
 * - children: Content to display
 * - onDelete: Delete handler (optional)
 * - className: Additional CSS classes
 */
const DraggableItem = ({ id, children, onDelete, className = '' }) => {
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
    zIndex: isDragging ? 1000 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`ds-followup-card ${className} ds-fade-in`}
    >
      {/* Drag Handle */}
      <div className="ds-drag-handle" {...attributes} {...listeners}>
        ⋮⋮
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>

      {/* Delete Button */}
      {onDelete && (
        <button
          onClick={onDelete}
          className="ds-btn-ghost"
          style={{
            color: 'var(--text-muted)',
            padding: 'var(--space-xs)'
          }}
          title="Delete"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default DraggableItem;
