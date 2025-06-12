import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Zap, 
  Clock, 
  TrendingUp,
  Award,
  Battery,
  Hash
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { miningAPI, energyAPI } from '../services/api';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';
import { useAuth } from '../hooks/useAuth';
import MiningOrb from '../components/MiningOrb';
import ProgressBar from '../components/ProgressBar';
import StatCard from '../components/StatCard';
import MiningHistory from '../components/MiningHistory';
import './MiningDashboard.css';

const MiningDashboard = () => {
  const [miningProgress, setMiningProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const { hapticFeedback } = useTelegramWebApp();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch mining status
  const { data: miningStatus, isLoading: statusLoading } = useQuery(
    'miningStatus',
    miningAPI.getStatus,
    {
      refetchInterval: 1000, // Update every second
      select: (response) => response.data
    }
  );

  // Fetch energy status
  const { data: energyStatus } = useQuery(
    'energyStatus',
    energyAPI.getStatus,
    {
      refetchInterval: 5000, // Update every 5 seconds
      select: (response) => response.data
    }
  );

  // Fetch mining history
  const { data: miningHistory } = useQuery(
    'miningHistory',
    () => miningAPI.getHistory({ limit: 10 }),
    {
      refetchInterval: 30000, // Update every 30 seconds
      select: (response) => response.data
    }
  );

  // Start mining mutation
  const startMiningMutation = useMutation(miningAPI.startMining, {
    onSuccess: () => {
      hapticFeedback('impact', 'medium');
      toast.success('Mining started!');
      queryClient.invalidateQueries('miningStatus');
      queryClient.invalidateQueries('energyStatus');
    },
    onError: (error) => {
      hapticFeedback('notification', 'error');
      toast.error(error.response?.data?.message || 'Failed to start mining');
    }
  });

  // Stop mining mutation
  const stopMiningMutation = useMutation(miningAPI.stopMining, {
    onSuccess: () => {
      hapticFeedback('impact', 'light');
      toast.success('Mining stopped');
      queryClient.invalidateQueries('miningStatus');
    },
    onError: (error) => {
      hapticFeedback('notification', 'error');
      toast.error(error.response?.data?.message || 'Failed to stop mining');
    }
  });

  // Update mining progress
  useEffect(() => {
    if (miningStatus?.isActive && miningStatus?.blockStartTime) {
      const updateProgress = () => {
        const now = Date.now();
        const startTime = new Date(miningStatus.blockStartTime).getTime();
        const blockDuration = 3 * 60 * 1000; // 3 minutes in milliseconds
        const elapsed = now - startTime;
        const progress = Math.min((elapsed / blockDuration) * 100, 100);
        const remaining = Math.max(blockDuration - elapsed, 0);

        setMiningProgress(progress);
        setTimeRemaining(remaining);

        // Auto-refresh when block completes
        if (progress >= 100) {
          queryClient.invalidateQueries('miningStatus');
          queryClient.invalidateQueries('miningHistory');
        }
      };

      updateProgress();
      const interval = setInterval(updateProgress, 1000);
      return () => clearInterval(interval);
    } else {
      setMiningProgress(0);
      setTimeRemaining(0);
    }
  }, [miningStatus, queryClient]);

  const handleMiningToggle = () => {
    if (miningStatus?.isActive) {
      stopMiningMutation.mutate();
    } else {
      if (energyStatus?.current < 33) {
        toast.error('Insufficient energy! Need at least 33 energy to mine.');
        return;
      }
      startMiningMutation.mutate();
    }
  };

  const formatTime = (milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatHashrate = (hashrate) => {
    if (hashrate >= 1000000) {
      return `${(hashrate / 1000000).toFixed(1)}MH/s`;
    } else if (hashrate >= 1000) {
      return `${(hashrate / 1000).toFixed(1)}KH/s`;
    }
    return `${hashrate}H/s`;
  };

  if (statusLoading) {
    return (
      <div className="mining-loading">
        <div className="loading-spinner" />
        <p>Loading mining status...</p>
      </div>
    );
  }

  return (
    <div className="mining-dashboard">
      {/* Header Stats */}
      <div className="dashboard-header">
        <div className="header-stats">
          <StatCard
            icon={<Hash size={16} />}
            label="Hashrate"
            value={formatHashrate(miningStatus?.hashrate || 100)}
            color="#1E90FF"
          />
          <StatCard
            icon={<Battery size={16} />}
            label="Energy"
            value={`${energyStatus?.current || 0}/${energyStatus?.max || 1000}`}
            color="#10B981"
            progress={(energyStatus?.current || 0) / (energyStatus?.max || 1000) * 100}
          />
          <StatCard
            icon={<Award size={16} />}
            label="AEGT"
            value={user?.aegtBalance ? (user.aegtBalance / 1e9).toFixed(2) : '0.00'}
            color="#FFD700"
          />
        </div>
      </div>

      {/* Mining Orb Section */}
      <div className="mining-section">
        <div className="mining-container">
          <MiningOrb
            isActive={miningStatus?.isActive}
            progress={miningProgress}
            level={miningStatus?.minerLevel || 1}
          />
          
          {/* Mining Status */}
          <div className="mining-status">
            <AnimatePresence mode="wait">
              {miningStatus?.isActive ? (
                <motion.div
                  key="mining"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="status-active"
                >
                  <h3>Mining Block #{miningStatus.currentBlock}</h3>
                  <p className="status-text">
                    {miningProgress >= 100 ? 'Block Complete!' : 'Mining in progress...'}
                  </p>
                  {timeRemaining > 0 && (
                    <div className="time-remaining">
                      <Clock size={16} />
                      <span>{formatTime(timeRemaining)}</span>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="waiting"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="status-waiting"
                >
                  <h3>Miner Ready</h3>
                  <p className="status-text">Start mining to earn AEGT tokens</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Progress Bar */}
          <div className="progress-section">
            <ProgressBar
              progress={miningProgress}
              label={miningStatus?.isActive ? "Block Progress" : "Ready to Mine"}
              showPercentage={miningStatus?.isActive}
            />
          </div>

          {/* Mining Button */}
          <motion.button
            className={`mining-btn ${miningStatus?.isActive ? 'mining-btn-stop' : 'mining-btn-start'}`}
            onClick={handleMiningToggle}
            disabled={startMiningMutation.isLoading || stopMiningMutation.isLoading}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="btn-content">
              {miningStatus?.isActive ? (
                <>
                  <Pause size={20} />
                  <span>Stop Mining</span>
                </>
              ) : (
                <>
                  <Play size={20} />
                  <span>Start Mining</span>
                </>
              )}
            </div>
            {(startMiningMutation.isLoading || stopMiningMutation.isLoading) && (
              <div className="btn-loading">
                <div className="loading-spinner-small" />
              </div>
            )}
          </motion.button>
        </div>
      </div>

      {/* Mining History */}
      <div className="history-section">
        <div className="section-header">
          <h3>Latest Mining Blocks</h3>
          <TrendingUp size={20} />
        </div>
        <MiningHistory blocks={miningHistory?.blocks || []} />
      </div>

      {/* Energy Warning */}
      <AnimatePresence>
        {energyStatus?.current < 100 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="energy-warning"
          >
            <div className="warning-content">
              <Zap size={20} />
              <div className="warning-text">
                <h4>Low Energy</h4>
                <p>Your energy is running low. Consider upgrading or refilling.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MiningDashboard;