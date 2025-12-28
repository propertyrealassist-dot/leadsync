import React from 'react';
import '../../styles/design-system.css';

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
  valueFormatter = (v) => v,
  labels = null
}) => {
  const getLabelForValue = (val) => {
    if (!labels || labels.length === 0) return null;
    const range = max - min;
    const segmentSize = range / labels.length;
    const index = Math.min(Math.floor((val - min) / segmentSize), labels.length - 1);
    return labels[index];
  };

  const currentLabel = getLabelForValue(value);
  const formattedValue = valueFormatter(value);

  return (
    <div className="ds-spacer-lg">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-md)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          {icon && <span style={{ fontSize: 'var(--font-lg)' }}>{icon}</span>}
          <span style={{
            fontSize: 'var(--font-base)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--text-primary)'
          }}>
            {label}
          </span>
        </div>
        {showValue && (
          <div style={{ textAlign: 'right' }}>
            {currentLabel && (
              <div style={{
                fontSize: 'var(--font-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--text-secondary)',
                marginBottom: '4px'
              }}>
                {currentLabel}
              </div>
            )}
            <span style={{
              fontSize: 'var(--font-base)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--leadsync-purple)',
              minWidth: '48px',
              display: 'inline-block'
            }}>
              {formattedValue}
            </span>
          </div>
        )}
      </div>

      <input
        type="range"
        className="ds-slider"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
      />

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
