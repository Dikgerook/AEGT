import React from 'react';
import { motion } from 'framer-motion';
import { Wallet as WalletIcon, Send, Download } from 'lucide-react';

const Wallet = () => {
  return (
    <div className="wallet-page">
      <div className="wallet-header">
        <h2>Wallet</h2>
        <p>Manage your AEGT and TON</p>
      </div>
      
      <div className="balance-cards">
        <motion.div className="balance-card" whileHover={{ scale: 1.02 }}>
          <div className="balance-icon">
            <WalletIcon size={24} />
          </div>
          <div className="balance-info">
            <h3>AEGT Balance</h3>
            <p className="balance-amount">0.00 AEGT</p>
          </div>
        </motion.div>
        
        <motion.div className="balance-card" whileHover={{ scale: 1.02 }}>
          <div className="balance-icon">
            <WalletIcon size={24} />
          </div>
          <div className="balance-info">
            <h3>TON Balance</h3>
            <p className="balance-amount">0.00 TON</p>
          </div>
        </motion.div>
      </div>
      
      <div className="wallet-actions">
        <button className="wallet-btn">
          <Send size={20} />
          <span>Send</span>
        </button>
        <button className="wallet-btn">
          <Download size={20} />
          <span>Receive</span>
        </button>
      </div>
    </div>
  );
};

export default Wallet;