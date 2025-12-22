import React from 'react';
import '../../styles/design-system.css';

/**
 * LabeledSlider - Slider with icon, label, value display, and optional description
 *
 * Props:
 * - icon: Emoji or icon
 * - label: Label text on the left
 * - value: Current value
 * - onChange: Change handler
 * - min: Minimum value (default 0)
 * - max: Maximum value (default 100)
 * - step: Step increment (default 1)
 * - description: Optional description below slider
 * - showValue: Show value on right (default true)
 * - valueFormatter: Function to format displayed value
 */
const LabeledSlider = ({
  icon,
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  description,
  showValue = true,
  valueFormatter = (v) => v
}) => {
  return (
    <div className="ds-spacer-lg">
      {/* Header with icon, label, and value */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-md)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          {icon && (
            <span style={{ fontSize: 'var(--font-lg)' }}>{icon}</span>
          )}
          <span style={{
            fontSize: 'var(--font-base)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--text-primary)'
          }}>
            {label}
          </span>
        </div>
        {showValue && (
          <span style={{
            fontSize: 'var(--font-base)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--accent-green)',
            minWidth: '48px',
            textAlign: 'right'
          }}>
            {valueFormatter(value)}
          </span>
        )}
      </div>

      {/* Slider */}
      <input
        type="range"
        className="ds-slider"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
      />

      {/* Description */}
      {description && (
        <div style={{
          fontSize: 'var(--font-sm)',
          color: 'var(--text-tertiary)',
          marginTop: 'var(--space-sm)',
          lineHeight: 1.5
        }}>
          {description}
        </div>
      )}
    </div>
  );
};

export default LabeledSlider;
