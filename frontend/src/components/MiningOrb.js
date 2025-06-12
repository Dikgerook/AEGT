import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Cpu, Pickaxe } from 'lucide-react';
import './MiningOrb.css';

const MiningOrb = ({ isActive, progress, level = 1 }) => {
  const orbVariants = {
    idle: {
      scale: 1,
      rotate: 0,
      boxShadow: '0 0 30px rgba(30, 144, 255, 0.3)',
    },
    active: {
      scale: [1, 1.05, 1],
      rotate: [0, 360],
      boxShadow: [
        '0 0 30px rgba(30, 144, 255, 0.3)',
        '0 0 50px rgba(16, 185, 129, 0.5)',
        '0 0 30px rgba(30, 144, 255, 0.3)',
      ],
      transition: {
        scale: {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        },
        rotate: {
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        },
        boxShadow: {
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
  };

  const coreVariants = {
    idle: {
      scale: 1,
      opacity: 0.8,
    },
    active: {
      scale: [1, 1.2, 1],
      opacity: [0.8, 1, 0.8],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  const ringVariants = {
    idle: {
      rotate: 0,
      scale: 1,
    },
    active: {
      rotate: 360,
      scale: [1, 1.1, 1],
      transition: {
        rotate: {
          duration: 15,
          repeat: Infinity,
          ease: 'linear',
        },
        scale: {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
  };

  const particleVariants = {
    idle: {
      opacity: 0,
      scale: 0,
    },
    active: {
      opacity: [0, 1, 0],
      scale: [0, 1, 0],
      y: [0, -50, -100],
      x: [0, Math.random() * 40 - 20, Math.random() * 80 - 40],
      transition: {
        duration: 2,
        repeat: Infinity,
        delay: Math.random() * 2,
        ease: 'easeOut',
      },
    },
  };

  const getLevelColor = (level) => {
    const colors = {
      1: '#1E90FF',
      2: '#10B981',
      3: '#F59E0B',
      4: '#EF4444',
      5: '#8B5CF6',
    };
    return colors[level] || colors[1];
  };

  const getLevelIcon = (level) => {
    if (level >= 5) return Zap;
    if (level >= 3) return Cpu;
    return Pickaxe;
  };

  const LevelIcon = getLevelIcon(level);
  const levelColor = getLevelColor(level);

  return (
    <div className="mining-orb-container">
      {/* Background Glow */}
      <div 
        className={`orb-glow ${isActive ? 'orb-glow-active' : ''}`}
        style={{ '--level-color': levelColor }}
      />
      
      {/* Main Orb */}
      <motion.div
        className="mining-orb"
        variants={orbVariants}
        animate={isActive ? 'active' : 'idle'}
        style={{ '--level-color': levelColor }}
      >
        {/* Outer Ring */}
        <motion.div
          className="orb-ring orb-ring-outer"
          variants={ringVariants}
          animate={isActive ? 'active' : 'idle'}
        >
          <div className="ring-segment" />
          <div className="ring-segment" />
          <div className="ring-segment" />
          <div className="ring-segment" />
        </motion.div>

        {/* Inner Ring */}
        <motion.div
          className="orb-ring orb-ring-inner"
          variants={ringVariants}
          animate={isActive ? 'active' : 'idle'}
          style={{ animationDirection: 'reverse' }}
        >
          <div className="ring-dot" />
          <div className="ring-dot" />
          <div className="ring-dot" />
          <div className="ring-dot" />
          <div className="ring-dot" />
          <div className="ring-dot" />
        </motion.div>

        {/* Core */}
        <motion.div
          className="orb-core"
          variants={coreVariants}
          animate={isActive ? 'active' : 'idle'}
        >
          <div className="core-inner">
            <LevelIcon size={32} />
          </div>
          
          {/* Progress Ring */}
          <svg className="progress-ring" viewBox="0 0 100 100">
            <circle
              className="progress-ring-background"
              cx="50"
              cy="50"
              r="45"
            />
            <motion.circle
              className="progress-ring-progress"
              cx="50"
              cy="50"
              r="45"
              style={{
                strokeDasharray: `${2 * Math.PI * 45}`,
                strokeDashoffset: `${2 * Math.PI * 45 * (1 - progress / 100)}`,
                stroke: levelColor,
              }}
              initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
              animate={{ 
                strokeDashoffset: 2 * Math.PI * 45 * (1 - progress / 100),
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </svg>
        </motion.div>

        {/* Level Badge */}
        <div className="level-badge" style={{ '--level-color': levelColor }}>
          <span>LV {level}</span>
        </div>

        {/* Mining Particles */}
        {isActive && (
          <div className="mining-particles">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="particle"
                variants={particleVariants}
                animate="active"
                style={{
                  left: `${50 + Math.cos((i * Math.PI * 2) / 8) * 30}%`,
                  top: `${50 + Math.sin((i * Math.PI * 2) / 8) * 30}%`,
                  backgroundColor: levelColor,
                }}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Status Text */}
      <div className="orb-status">
        <motion.div
          className={`status-indicator ${isActive ? 'status-active' : 'status-idle'}`}
          animate={{
            opacity: isActive ? [0.5, 1, 0.5] : 1,
          }}
          transition={{
            duration: 2,
            repeat: isActive ? Infinity : 0,
            ease: 'easeInOut',
          }}
        >
          {isActive ? 'Mining' : 'Waiting'}
        </motion.div>
        
        {progress > 0 && (
          <div className="progress-text">
            {progress.toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
};

export default MiningOrb;