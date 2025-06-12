import React from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingUp, Battery, Cpu } from 'lucide-react';

const UpgradeShop = () => {
  const upgrades = [
    {
      id: 1,
      name: 'Miner Level 2',
      description: 'Increase hashrate to 200 H/s',
      icon: <Cpu size={24} />,
      cost: '0.1 TON',
      benefit: '+100 H/s',
      type: 'miner'
    },
    {
      id: 2,
      name: 'Energy Boost',
      description: 'Increase energy capacity to 1500',
      icon: <Battery size={24} />,
      cost: '0.05 TON',
      benefit: '+500 Energy',
      type: 'energy'
    }
  ];

  return (
    <div className="upgrade-shop">
      <div className="shop-header">
        <h2>Upgrade Shop</h2>
        <p>Enhance your mining capabilities</p>
      </div>
      
      <div className="upgrades-grid">
        {upgrades.map((upgrade) => (
          <motion.div
            key={upgrade.id}
            className="upgrade-card"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="upgrade-icon">
              {upgrade.icon}
            </div>
            <h3>{upgrade.name}</h3>
            <p>{upgrade.description}</p>
            <div className="upgrade-benefit">
              <TrendingUp size={16} />
              <span>{upgrade.benefit}</span>
            </div>
            <button className="upgrade-btn">
              <span>Upgrade for {upgrade.cost}</span>
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default UpgradeShop;