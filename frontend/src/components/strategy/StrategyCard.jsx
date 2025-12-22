import React from 'react';
import '../../styles/strategy.css';

/**
 * StrategyCard - Reusable card container with modern styling
 *
 * Props:
 * - children: Content to render inside the card
 * - interactive: Whether the card should have hover effects (default: false)
 * - className: Additional CSS classes
 * - onClick: Click handler (makes card interactive automatically)
 * - style: Additional inline styles
 */
const StrategyCard = ({
  children,
  interactive = false,
  className = '',
  onClick,
  style
}) => {
  const isInteractive = interactive || !!onClick;

  return (
    <div
      className={`strategy-card ${isInteractive ? 'interactive' : ''} ${className}`}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  );
};

export default StrategyCard;
