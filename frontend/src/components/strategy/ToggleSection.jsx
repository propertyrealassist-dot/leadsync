import React from 'react';
import '../../styles/design-system.css';

/**
 * ToggleSection - Section with icon, title, description, and toggle/dropdown on right
 *
 * Props:
 * - icon: Emoji or icon
 * - title: Section title
 * - description: Section description
 * - type: 'toggle' or 'dropdown'
 * - value: Current value (boolean for toggle, string for dropdown)
 * - onChange: Change handler
 * - options: Array of options for dropdown [{ value, label }]
 */
const ToggleSection = ({
  icon,
  title,
  description,
  type = 'toggle',
  value,
  onChange,
  options = []
}) => {
  return (
    <div className="ds-toggle-section">
      {/* Left side: Icon + Content */}
      <div className="ds-toggle-section-left">
        {icon && (
          <div className="ds-toggle-section-icon">{icon}</div>
        )}
        <div className="ds-toggle-section-content">
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
      </div>

      {/* Right side: Toggle or Dropdown */}
      <div>
        {type === 'toggle' ? (
          <label className="ds-toggle">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span className="ds-toggle-slider"></span>
          </label>
        ) : (
          <select
            className="ds-select"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ minWidth: '200px' }}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
};

export default ToggleSection;
