import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import '../../styles/strategy.css';

/**
 * MonacoPromptEditor - Code editor for AI prompts with syntax highlighting
 *
 * Props:
 * - value: Editor content
 * - onChange: Change handler
 * - placeholder: Placeholder text
 * - height: Editor height (default: '400px')
 * - showStats: Show character/token count (default: true)
 */
const MonacoPromptEditor = ({
  value,
  onChange,
  placeholder = 'Enter your AI prompt instructions...',
  height = '400px',
  showStats = true
}) => {
  const [charCount, setCharCount] = useState(0);
  const [tokenCount, setTokenCount] = useState(0);

  useEffect(() => {
    const text = value || '';
    setCharCount(text.length);
    // Rough token estimation: ~4 chars per token
    setTokenCount(Math.ceil(text.length / 4));
  }, [value]);

  const handleEditorChange = (newValue) => {
    onChange(newValue || '');
  };

  return (
    <div className="monaco-editor-container">
      <div
        style={{
          border: '1px solid var(--strategy-border)',
          borderRadius: 'var(--strategy-radius-lg)',
          overflow: 'hidden',
          background: 'var(--strategy-bg-base)'
        }}
      >
        <Editor
          height={height}
          defaultLanguage="markdown"
          value={value || ''}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            wrappingIndent: 'indent',
            padding: { top: 16, bottom: 16 },
            fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
            lineHeight: 24,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            placeholder: placeholder
          }}
        />
      </div>

      {showStats && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '8px',
            fontSize: '0.8125rem',
            color: 'var(--strategy-text-tertiary)'
          }}
        >
          <span>Character Count: {charCount.toLocaleString()}</span>
          <span>Tokens: ~{tokenCount.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};

export default MonacoPromptEditor;
