import React from 'react';
import '../../styles/strategy.css';

/**
 * SearchBar - Search input with icon
 *
 * Props:
 * - value: Search value
 * - onChange: Change handler
 * - placeholder: Placeholder text
 * - onClear: Clear handler
 */
const SearchBar = ({
  value,
  onChange,
  placeholder = 'Search...',
  onClear
}) => {
  return (
    <div style={{ position: 'relative', marginBottom: '16px' }}>
      <div
        style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '1.1rem',
          color: 'var(--strategy-text-tertiary)',
          pointerEvents: 'none'
        }}
      >
        🔍
      </div>
      <input
        type="text"
        className="strategy-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ paddingLeft: '40px', paddingRight: value ? '40px' : '12px' }}
      />
      {value && (
        <button
          onClick={onClear}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'var(--strategy-text-tertiary)',
            cursor: 'pointer',
            fontSize: '1.2rem',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>
      )}
    </div>
  );
};

export default SearchBar;
