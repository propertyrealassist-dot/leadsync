import React from 'react';
import '../../styles/strategy.css';

/**
 * ModernSlider - Beautiful slider with value display
 *
 * Props:
 * - label: Slider label
 * - value: Current value
 * - onChange: Change handler
 * - min: Minimum value (default: 0)
 * - max: Maximum value (default: 10)
 * - step: Step increment (default: 0.1)
 * - formatValue: Function to format displayed value
 * - description: Optional description text
 */
const ModernSlider = ({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  step = 0.1,
  formatValue,
  description
}) => {
  const displayValue = formatValue ? formatValue(value) : value;

  return (
    <div className="strategy-slider-container">
      <div className="strategy-slider-label">
        <div>
          <span className="strategy-slider-label-text">{label}</span>
          {description && (
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--strategy-text-tertiary)',
                marginTop: '2px'
              }}
            >
              {description}
            </div>
          )}
        </div>
        <span className="strategy-slider-value">{displayValue}</span>
      </div>
      <input
        type="range"
        className="strategy-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
};

export default ModernSlider;
