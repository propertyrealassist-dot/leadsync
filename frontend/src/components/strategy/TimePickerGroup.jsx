import React from 'react';
import '../../styles/design-system.css';

/**
 * TimePickerGroup - Time input with hours, minutes, seconds
 *
 * Props:
 * - value: Object with { hours, minutes, seconds }
 * - onChange: Callback with updated time object
 * - label: Optional label above the time picker
 */
const TimePickerGroup = ({ value = { hours: 0, minutes: 0, seconds: 0 }, onChange, label }) => {
  const handleChange = (field, newValue) => {
    // Parse and validate
    let num = parseInt(newValue) || 0;

    // Clamp values
    if (field === 'hours') num = Math.max(0, Math.min(99, num));
    if (field === 'minutes' || field === 'seconds') num = Math.max(0, Math.min(59, num));

    onChange({
      ...value,
      [field]: num
    });
  };

  const formatValue = (num) => {
    return String(num).padStart(2, '0');
  };

  return (
    <div>
      {label && (
        <div style={{
          fontSize: 'var(--font-sm)',
          color: 'var(--text-secondary)',
          marginBottom: 'var(--space-sm)',
          fontWeight: 'var(--font-weight-medium)'
        }}>
          {label}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        {/* Hours */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-xs)' }}>
          <input
            type="number"
            className="ds-time-input"
            value={formatValue(value.hours)}
            onChange={(e) => handleChange('hours', e.target.value)}
            min="0"
            max="99"
          />
          <span style={{
            fontSize: 'var(--font-xs)',
            color: 'var(--text-muted)',
            fontWeight: 'var(--font-weight-medium)'
          }}>
            hr
          </span>
        </div>

        {/* Minutes */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-xs)' }}>
          <input
            type="number"
            className="ds-time-input"
            value={formatValue(value.minutes)}
            onChange={(e) => handleChange('minutes', e.target.value)}
            min="0"
            max="59"
          />
          <span style={{
            fontSize: 'var(--font-xs)',
            color: 'var(--text-muted)',
            fontWeight: 'var(--font-weight-medium)'
          }}>
            min
          </span>
        </div>

        {/* Seconds */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-xs)' }}>
          <input
            type="number"
            className="ds-time-input"
            value={formatValue(value.seconds)}
            onChange={(e) => handleChange('seconds', e.target.value)}
            min="0"
            max="59"
          />
          <span style={{
            fontSize: 'var(--font-xs)',
            color: 'var(--text-muted)',
            fontWeight: 'var(--font-weight-medium)'
          }}>
            sec
          </span>
        </div>
      </div>
    </div>
  );
};

export default TimePickerGroup;
