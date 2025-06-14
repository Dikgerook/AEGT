import React from 'react';
import { motion } from 'framer-motion';
import { Hammer } from 'lucide-react';
import './LoadingScreen.css';

const LoadingScreen = () => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        {/* Animated Logo */}
        <motion.div
          className="loading-logo"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="logo-icon-large"
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
            }}
          >
            <Hammer size={48} />
          </motion.div>
          
          <motion.h1
            className="loading-title"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Aegisum
          </motion.h1>
          
          <motion.p
            className="loading-subtitle"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            Tap2Earn Mining
          </motion.p>
        </motion.div>

        {/* Loading Progress */}
        <motion.div
          className="loading-progress"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "100%", opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
        >
          <div className="progress-container">
            <motion.div
              className="progress-bar"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ 
                delay: 1,
                duration: 2,
                ease: "easeInOut"
              }}
            />
          </div>
          
          <motion.div
            className="loading-dots"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
            >
              •
            </motion.span>
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            >
              •
            </motion.span>
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
            >
              •
            </motion.span>
          </motion.div>
        </motion.div>

        {/* Loading Messages */}
        <motion.div
          className="loading-messages"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <motion.p
            key="initializing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="loading-message"
          >
            Initializing mining systems...
          </motion.p>
        </motion.div>

        {/* Floating Particles */}
        <div className="loading-particles">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="particle"
              initial={{ 
                x: Math.random() * window.innerWidth,
                y: window.innerHeight + 20,
                opacity: 0
              }}
              animate={{
                y: -20,
                opacity: [0, 1, 0],
                x: Math.random() * window.innerWidth
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "linear"
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
