import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../../styles/strategy.css';

/**
 * StrategySection - Collapsible section with header and content
 *
 * Props:
 * - title: Section title (string or React element)
 * - icon: Icon to display before title
 * - children: Section content
 * - defaultExpanded: Whether section starts expanded (default: true)
 * - collapsible: Whether section can be collapsed (default: false)
 * - actions: React element to render in the header (e.g., buttons)
 * - className: Additional CSS classes
 */
const StrategySection = ({
  title,
  icon,
  children,
  defaultExpanded = true,
  collapsible = false,
  actions,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    if (collapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className={`strategy-section ${className}`}>
      <div
        className="strategy-section-header"
        onClick={toggleExpanded}
        style={{ cursor: collapsible ? 'pointer' : 'default' }}
      >
        <div className="strategy-section-title">
          {icon && <span className="icon">{icon}</span>}
          <span>{title}</span>
          {collapsible && (
            <motion.span
              animate={{ rotate: isExpanded ? 0 : -90 }}
              transition={{ duration: 0.2 }}
              style={{ marginLeft: '8px' }}
            >
              ▼
            </motion.span>
          )}
        </div>
        {actions && <div>{actions}</div>}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StrategySection;
