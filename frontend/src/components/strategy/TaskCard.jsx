import React from 'react';
import '../../styles/design-system.css';

/**
 * TaskCard - Task display card with icon, title, description, and badges
 *
 * Props:
 * - icon: Emoji or icon
 * - title: Task title
 * - description: Task description
 * - badges: Array of badge objects [{ text, variant }]
 * - onClick: Click handler
 */
const TaskCard = ({ icon, title, description, badges = [], onClick }) => {
  return (
    <div className="ds-task-card ds-fade-in" onClick={onClick}>
      {/* Icon */}
      <div className="ds-task-icon">
        {icon}
      </div>

      {/* Content */}
      <div className="ds-task-content">
        <div className="ds-task-title">{title}</div>
        <div className="ds-task-description">{description}</div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="ds-task-badges">
            {badges.map((badge, index) => (
              <span
                key={index}
                className={`ds-badge ${badge.variant === 'green' ? 'ds-badge-green' : ''}`}
              >
                {badge.text}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
