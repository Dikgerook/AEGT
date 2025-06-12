import React from 'react';
import { motion } from 'framer-motion';
import ProgressBar from './ProgressBar';
import './StatCard.css';

const StatCard = ({ 
  icon, 
  label, 
  value, 
  change, 
  color = '#1E90FF',
  progress,
  onClick,
  loading = false 
}) => {
  const cardVariants = {
    initial: { scale: 1, y: 0 },
    hover: { 
      scale: 1.02, 
      y: -2,
      transition: { duration: 0.2, ease: 'easeOut' }
    },
    tap: { 
      scale: 0.98,
      transition: { duration: 0.1 }
    }
  };

  const iconVariants = {
    initial: { rotate: 0 },
    hover: { 
      rotate: 5,
      transition: { duration: 0.2 }
    }
  };

  const formatChange = (change) => {
    if (!change) return null;
    const isPositive = change > 0;
    const prefix = isPositive ? '+' : '';
    return `${prefix}${change}`;
  };

  const getChangeColor = (change) => {
    if (!change) return 'var(--text-secondary)';
    return change > 0 ? '#10B981' : '#EF4444';
  };

  return (
    <motion.div
      className={`stat-card ${onClick ? 'stat-card-clickable' : ''}`}
      variants={cardVariants}
      initial="initial"
      whileHover="hover"
      whileTap={onClick ? "tap" : "initial"}
      onClick={onClick}
      style={{ '--stat-color': color }}
    >
      {loading && (
        <div className="stat-loading">
          <div className="loading-spinner-tiny" />
        </div>
      )}
      
      <div className="stat-header">
        <motion.div 
          className="stat-icon"
          variants={iconVariants}
          style={{ color }}
        >
          {icon}
        </motion.div>
        
        {change !== undefined && (
          <div 
            className="stat-change"
            style={{ color: getChangeColor(change) }}
          >
            {formatChange(change)}
          </div>
        )}
      </div>
      
      <div className="stat-content">
        <div className="stat-value">
          {value}
        </div>
        <div className="stat-label">
          {label}
        </div>
      </div>
      
      {progress !== undefined && (
        <div className="stat-progress">
          <ProgressBar
            progress={progress}
            color={color}
            height="sm"
            animated={false}
            showPercentage={false}
          />
        </div>
      )}
    </motion.div>
  );
};

export default StatCard;