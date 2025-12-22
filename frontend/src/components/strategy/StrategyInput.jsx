import React from 'react';
import '../../styles/strategy.css';

/**
 * StrategyInput - Enhanced input component with label and character count
 *
 * Props:
 * - label: Input label
 * - value: Input value
 * - onChange: Change handler
 * - placeholder: Placeholder text
 * - type: Input type (default: 'text')
 * - maxLength: Maximum character length
 * - showCharCount: Whether to show character count (default: false)
 * - multiline: Whether to render as textarea (default: false)
 * - rows: Number of rows for textarea (default: 3)
 * - required: Whether field is required
 * - error: Error message to display
 * - className: Additional CSS classes
 */
const StrategyInput = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  maxLength,
  showCharCount = false,
  multiline = false,
  rows = 3,
  required = false,
  error,
  className = '',
  ...props
}) => {
  const InputComponent = multiline ? 'textarea' : 'input';

  const charCount = value?.length || 0;
  const showCount = showCharCount && maxLength;

  return (
    <div className={`strategy-input-group ${className}`}>
      {label && (
        <label className="strategy-label">
          {label}
          {required && <span style={{ color: 'var(--strategy-error)' }}> *</span>}
        </label>
      )}

      <InputComponent
        className={multiline ? 'strategy-textarea' : 'strategy-input'}
        type={!multiline ? type : undefined}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={multiline ? rows : undefined}
        required={required}
        {...props}
      />

      {showCount && (
        <div className="strategy-char-count">
          {charCount} / {maxLength}
        </div>
      )}

      {error && (
        <div
          style={{
            color: 'var(--strategy-error)',
            fontSize: '0.8125rem',
            marginTop: '4px'
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default StrategyInput;
