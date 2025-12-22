import React from 'react';
import { motion } from 'framer-motion';
import '../../styles/strategy.css';

/**
 * StrategyToggle - Modern toggle switch component
 *
 * Props:
 * - label: Toggle label text
 * - checked: Whether toggle is checked
 * - onChange: Change handler
 * - disabled: Whether toggle is disabled
 * - description: Optional description text below label
 * - className: Additional CSS classes
 */
const StrategyToggle = ({
  label,
  checked,
  onChange,
  disabled = false,
  description,
  className = ''
}) => {
  return (
    <div className={`strategy-toggle-container ${className}`}>
      <label
        className="strategy-toggle"
        style={{
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
      >
        <div
          className={`strategy-toggle-switch ${checked ? 'active' : ''}`}
          onClick={() => !disabled && onChange(!checked)}
        >
          <motion.div
            className="strategy-toggle-knob"
            layout
            transition={{
              type: 'spring',
              stiffness: 700,
              damping: 30
            }}
          />
        </div>
        <div>
          <span className="strategy-toggle-label">{label}</span>
          {description && (
            <div
              style={{
                fontSize: '0.8125rem',
                color: 'var(--strategy-text-tertiary)',
                marginTop: '2px'
              }}
            >
              {description}
            </div>
          )}
        </div>
      </label>
    </div>
  );
};

export default StrategyToggle;
