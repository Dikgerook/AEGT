import React from 'react';
import { motion } from 'framer-motion';
import './ProgressBar.css';

const ProgressBar = ({ 
  progress = 0, 
  label = '', 
  showPercentage = true,
  color = '#1E90FF',
  height = 'md',
  animated = true 
}) => {
  const getHeight = () => {
    switch (height) {
      case 'sm': return '6px';
      case 'lg': return '12px';
      case 'xl': return '16px';
      default: return '8px';
    }
  };

  return (
    <div className="progress-bar-container">
      {(label || showPercentage) && (
        <div className="progress-header">
          {label && (
            <span className="progress-label">{label}</span>
          )}
          {showPercentage && (
            <span className="progress-percentage">
              {Math.round(progress)}%
            </span>
          )}
        </div>
      )}
      
      <div 
        className="progress-track"
        style={{ height: getHeight() }}
      >
        <motion.div
          className={`progress-fill ${animated ? 'progress-animated' : ''}`}
          style={{
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}40`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          transition={{ 
            duration: 0.8, 
            ease: 'easeOut',
            type: 'spring',
            stiffness: 100,
            damping: 15
          }}
        >
          {animated && (
            <div 
              className="progress-shimmer"
              style={{ background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ProgressBar;