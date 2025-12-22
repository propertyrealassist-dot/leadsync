import React from 'react';
import { motion } from 'framer-motion';
import '../../styles/strategy.css';

/**
 * IntegrationCard - Integration selection card
 *
 * Props:
 * - name: Integration name
 * - icon: Icon/emoji
 * - description: Short description
 * - connected: Whether integration is connected
 * - onClick: Click handler to configure
 * - category: Integration category
 */
const IntegrationCard = ({
  name,
  icon,
  description,
  connected = false,
  onClick,
  category
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="strategy-card interactive"
      onClick={onClick}
      style={{
        cursor: 'pointer',
        position: 'relative',
        padding: '20px',
        textAlign: 'center',
        minHeight: '140px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
      }}
    >
      {connected && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '8px',
            height: '8px',
            background: 'var(--strategy-success)',
            borderRadius: '50%',
            boxShadow: '0 0 8px var(--strategy-success)'
          }}
        />
      )}

      <div style={{ fontSize: '2.5rem' }}>{icon}</div>
      <div
        style={{
          fontSize: '0.9375rem',
          fontWeight: 600,
          color: 'var(--strategy-text-primary)'
        }}
      >
        {name}
      </div>
      {description && (
        <div
          style={{
            fontSize: '0.8125rem',
            color: 'var(--strategy-text-tertiary)',
            lineHeight: 1.4
          }}
        >
          {description}
        </div>
      )}
      {category && (
        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--strategy-accent)',
            marginTop: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          {category}
        </div>
      )}
    </motion.div>
  );
};

export default IntegrationCard;
