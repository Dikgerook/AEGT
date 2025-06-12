import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Award, Zap, Hash } from 'lucide-react';
import './MiningHistory.css';

const MiningHistory = ({ blocks = [] }) => {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatReward = (reward) => {
    return (reward / 1e9).toFixed(2);
  };

  const getBlockTypeIcon = (isSolo) => {
    return isSolo ? <Award size={16} /> : <Hash size={16} />;
  };

  const getBlockTypeColor = (isSolo) => {
    return isSolo ? '#FFD700' : '#1E90FF';
  };

  const getBlockTypeLabel = (isSolo) => {
    return isSolo ? 'Solo' : 'Pool';
  };

  if (blocks.length === 0) {
    return (
      <div className="mining-history-empty">
        <div className="empty-icon">
          <Hash size={32} />
        </div>
        <h4>No blocks mined yet</h4>
        <p>Start mining to see your block history here</p>
      </div>
    );
  }

  return (
    <div className="mining-history">
      <AnimatePresence>
        {blocks.map((block, index) => (
          <motion.div
            key={block.id}
            className="history-item"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ 
              duration: 0.3, 
              delay: index * 0.1,
              ease: 'easeOut'
            }}
            whileHover={{ 
              scale: 1.02,
              transition: { duration: 0.2 }
            }}
          >
            <div className="item-header">
              <div className="block-info">
                <div 
                  className="block-type"
                  style={{ color: getBlockTypeColor(block.isSolo) }}
                >
                  {getBlockTypeIcon(block.isSolo)}
                  <span>{getBlockTypeLabel(block.isSolo)}</span>
                </div>
                <div className="block-number">
                  Block #{block.blockNumber}
                </div>
              </div>
              
              <div className="block-reward">
                <div className="reward-amount">
                  +{formatReward(block.reward)} AEGT
                </div>
                <div className="reward-badge">
                  <Award size={12} />
                </div>
              </div>
            </div>
            
            <div className="item-details">
              <div className="detail-item">
                <Clock size={14} />
                <span>{formatTime(block.timestamp)}</span>
              </div>
              
              <div className="detail-item">
                <Hash size={14} />
                <span>{block.hashrate}H/s</span>
              </div>
              
              <div className="detail-item">
                <Zap size={14} />
                <span>-{block.energyUsed} energy</span>
              </div>
            </div>
            
            {block.hash && (
              <div className="block-hash">
                <span className="hash-label">Hash:</span>
                <span className="hash-value">
                  {block.hash.substring(0, 8)}...{block.hash.substring(-8)}
                </span>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      
      {blocks.length >= 10 && (
        <motion.div
          className="history-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p>Showing latest 10 blocks</p>
        </motion.div>
      )}
    </div>
  );
};

export default MiningHistory;