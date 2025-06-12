const cron = require('node-cron');
const crypto = require('crypto');
const databaseService = require('./database');
const redisService = require('./redis');
const logger = require('../utils/logger');

class MiningService {
  constructor() {
    this.isInitialized = false;
    this.cronJobs = [];
    this.activeMiners = new Map();
    
    // Mining configuration
    this.config = {
      blockTime: parseInt(process.env.MINING_BLOCK_TIME) || 180000, // 3 minutes
      baseHashrate: parseInt(process.env.MINING_BASE_HASHRATE) || 100,
      baseEnergy: parseInt(process.env.MINING_BASE_ENERGY) || 1000,
      energyRegenRate: parseInt(process.env.MINING_ENERGY_REGEN_RATE) || 250, // per hour
      energyCostPerMinute: parseInt(process.env.MINING_ENERGY_COST_PER_MINUTE) || 33,
      treasuryFeePercentage: parseInt(process.env.TREASURY_FEE_PERCENTAGE) || 10,
      baseReward: 1000000000, // 1 AEGT in smallest units (9 decimals)
    };
  }

  async initialize() {
    try {
      // Start energy regeneration cron job (every minute)
      const energyRegenJob = cron.schedule('* * * * *', async () => {
        await this.regenerateEnergy();
      }, { scheduled: false });

      // Start mining progress check (every 10 seconds)
      const miningCheckJob = cron.schedule('*/10 * * * * *', async () => {
        await this.checkMiningProgress();
      }, { scheduled: false });

      // Start cleanup job (every hour)
      const cleanupJob = cron.schedule('0 * * * *', async () => {
        await this.cleanup();
      }, { scheduled: false });

      this.cronJobs = [energyRegenJob, miningCheckJob, cleanupJob];

      // Start all cron jobs
      this.cronJobs.forEach(job => job.start());

      // Load active miners from database
      await this.loadActiveMiners();

      this.isInitialized = true;
      logger.info('Mining service initialized');
    } catch (error) {
      logger.error('Failed to initialize mining service:', error);
      throw error;
    }
  }

  async stop() {
    // Stop all cron jobs
    this.cronJobs.forEach(job => job.stop());
    this.cronJobs = [];
    
    // Save active miners state
    await this.saveActiveMiners();
    
    this.isInitialized = false;
    logger.info('Mining service stopped');
  }

  async loadActiveMiners() {
    try {
      const query = `
        SELECT user_id, started_at, block_number, hashrate, energy_used
        FROM active_mining 
        WHERE started_at + INTERVAL '${this.config.blockTime} milliseconds' > NOW()
      `;
      
      const result = await databaseService.query(query);
      
      for (const row of result.rows) {
        this.activeMiners.set(row.user_id, {
          startedAt: row.started_at,
          blockNumber: row.block_number,
          hashrate: row.hashrate,
          energyUsed: row.energy_used
        });
      }
      
      logger.info(`Loaded ${this.activeMiners.size} active miners`);
    } catch (error) {
      logger.error('Failed to load active miners:', error);
    }
  }

  async saveActiveMiners() {
    try {
      // Clear existing active mining records
      await databaseService.query('DELETE FROM active_mining');
      
      // Save current active miners
      for (const [userId, miningData] of this.activeMiners) {
        await databaseService.query(
          `INSERT INTO active_mining (user_id, started_at, block_number, hashrate, energy_used)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, miningData.startedAt, miningData.blockNumber, miningData.hashrate, miningData.energyUsed]
        );
      }
      
      logger.info(`Saved ${this.activeMiners.size} active miners`);
    } catch (error) {
      logger.error('Failed to save active miners:', error);
    }
  }

  async startMining(userId) {
    try {
      // Check if user is already mining
      if (this.activeMiners.has(userId)) {
        throw new Error('User is already mining');
      }

      // Get user data
      const userQuery = `
        SELECT miner_level, energy_capacity, aegt_balance 
        FROM users 
        WHERE id = $1 AND is_active = true
      `;
      
      const userResult = await databaseService.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found or inactive');
      }

      const user = userResult.rows[0];

      // Get current energy
      const energyState = await redisService.getUserEnergyState(userId);
      const currentEnergy = await this.calculateCurrentEnergy(userId, energyState);

      // Check if user has enough energy
      const energyRequired = this.config.energyCostPerMinute * (this.config.blockTime / 60000);
      
      if (currentEnergy < energyRequired) {
        throw new Error(`Insufficient energy. Required: ${energyRequired}, Available: ${currentEnergy}`);
      }

      // Calculate hashrate based on miner level
      const hashrate = this.calculateHashrate(user.miner_level);

      // Generate block number
      const blockNumber = await this.generateBlockNumber();

      // Start mining
      const startedAt = new Date();
      
      this.activeMiners.set(userId, {
        startedAt,
        blockNumber,
        hashrate,
        energyUsed: energyRequired
      });

      // Update energy in Redis
      await redisService.setUserEnergyState(userId, {
        current: currentEnergy - energyRequired,
        max: user.energy_capacity,
        lastUpdate: Date.now(),
        regenRate: this.config.energyRegenRate
      });

      // Update mining state in Redis
      await redisService.setUserMiningState(userId, {
        isActive: true,
        hashrate,
        currentBlock: blockNumber,
        blockStartTime: startedAt.toISOString(),
        blocksMined: (await redisService.hget(`user:${userId}:mining`, 'blocksMined')) || 0,
        totalRewards: (await redisService.hget(`user:${userId}:mining`, 'totalRewards')) || 0
      });

      // Save to database
      await databaseService.query(
        `INSERT INTO active_mining (user_id, started_at, block_number, hashrate, energy_used)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO UPDATE SET
         started_at = $2, block_number = $3, hashrate = $4, energy_used = $5`,
        [userId, startedAt, blockNumber, hashrate, energyRequired]
      );

      logger.logMining(userId, 'start', {
        blockNumber,
        hashrate,
        energyUsed: energyRequired
      });

      return {
        success: true,
        blockNumber,
        hashrate,
        energyUsed: energyRequired,
        estimatedCompletion: new Date(startedAt.getTime() + this.config.blockTime)
      };
    } catch (error) {
      logger.error('Failed to start mining:', error);
      throw error;
    }
  }

  async stopMining(userId) {
    try {
      if (!this.activeMiners.has(userId)) {
        throw new Error('User is not currently mining');
      }

      // Remove from active miners
      this.activeMiners.delete(userId);

      // Update Redis state
      await redisService.setUserMiningState(userId, {
        isActive: false,
        hashrate: 0,
        currentBlock: null,
        blockStartTime: null,
        blocksMined: (await redisService.hget(`user:${userId}:mining`, 'blocksMined')) || 0,
        totalRewards: (await redisService.hget(`user:${userId}:mining`, 'totalRewards')) || 0
      });

      // Remove from database
      await databaseService.query('DELETE FROM active_mining WHERE user_id = $1', [userId]);

      logger.logMining(userId, 'stop');

      return { success: true };
    } catch (error) {
      logger.error('Failed to stop mining:', error);
      throw error;
    }
  }

  async getMiningStatus(userId) {
    try {
      const miningState = await redisService.getUserMiningState(userId);
      const energyState = await redisService.getUserEnergyState(userId);
      
      // Calculate current energy
      const currentEnergy = await this.calculateCurrentEnergy(userId, energyState);
      
      // Get user miner level
      const userQuery = `SELECT miner_level FROM users WHERE id = $1`;
      const userResult = await databaseService.query(userQuery, [userId]);
      const minerLevel = userResult.rows[0]?.miner_level || 1;

      let progress = 0;
      let timeRemaining = 0;

      if (miningState.isActive && miningState.blockStartTime) {
        const startTime = new Date(miningState.blockStartTime).getTime();
        const now = Date.now();
        const elapsed = now - startTime;
        
        progress = Math.min((elapsed / this.config.blockTime) * 100, 100);
        timeRemaining = Math.max(this.config.blockTime - elapsed, 0);
      }

      return {
        isActive: miningState.isActive || false,
        hashrate: miningState.hashrate || this.calculateHashrate(minerLevel),
        currentBlock: miningState.currentBlock,
        blockStartTime: miningState.blockStartTime,
        progress,
        timeRemaining,
        blocksMined: miningState.blocksMined || 0,
        totalRewards: miningState.totalRewards || 0,
        energy: {
          current: Math.floor(currentEnergy),
          max: energyState.max || this.config.baseEnergy,
          regenRate: energyState.regenRate || this.config.energyRegenRate
        },
        minerLevel
      };
    } catch (error) {
      logger.error('Failed to get mining status:', error);
      throw error;
    }
  }

  async checkMiningProgress() {
    try {
      const now = Date.now();
      const completedMiners = [];

      for (const [userId, miningData] of this.activeMiners) {
        const elapsed = now - miningData.startedAt.getTime();
        
        if (elapsed >= this.config.blockTime) {
          completedMiners.push(userId);
        }
      }

      // Process completed mining operations
      for (const userId of completedMiners) {
        await this.completeMining(userId);
      }
    } catch (error) {
      logger.error('Error checking mining progress:', error);
    }
  }

  async completeMining(userId) {
    try {
      const miningData = this.activeMiners.get(userId);
      if (!miningData) return;

      // Get user data
      const userQuery = `SELECT miner_level, aegt_balance FROM users WHERE id = $1`;
      const userResult = await databaseService.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        logger.error(`User ${userId} not found during mining completion`);
        return;
      }

      const user = userResult.rows[0];

      // Calculate rewards
      const { reward, isSolo } = await this.calculateReward(user.miner_level);
      const treasuryFee = Math.floor(reward * this.config.treasuryFeePercentage / 100);
      const userReward = reward - treasuryFee;

      // Generate block hash
      const blockHash = this.generateBlockHash(miningData.blockNumber, userId, miningData.hashrate);

      // Update user balance
      await databaseService.query(
        'UPDATE users SET aegt_balance = aegt_balance + $1 WHERE id = $2',
        [userReward, userId]
      );

      // Record mining block
      await databaseService.query(
        `INSERT INTO mining_blocks (
          user_id, block_number, block_hash, hashrate, reward, treasury_fee,
          is_solo, energy_used, mined_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userId, miningData.blockNumber, blockHash, miningData.hashrate,
          userReward, treasuryFee, isSolo, miningData.energyUsed, new Date()
        ]
      );

      // Update Redis mining state
      const currentState = await redisService.getUserMiningState(userId);
      await redisService.setUserMiningState(userId, {
        isActive: false,
        hashrate: 0,
        currentBlock: null,
        blockStartTime: null,
        blocksMined: (currentState.blocksMined || 0) + 1,
        totalRewards: (currentState.totalRewards || 0) + userReward
      });

      // Remove from active miners
      this.activeMiners.delete(userId);
      await databaseService.query('DELETE FROM active_mining WHERE user_id = $1', [userId]);

      logger.logMining(userId, 'complete', {
        blockNumber: miningData.blockNumber,
        reward: userReward,
        treasuryFee,
        isSolo,
        blockHash
      });

      // Publish mining completion event
      await redisService.publish(`mining:complete:${userId}`, {
        blockNumber: miningData.blockNumber,
        reward: userReward,
        isSolo,
        blockHash
      });

    } catch (error) {
      logger.error(`Failed to complete mining for user ${userId}:`, error);
    }
  }

  async regenerateEnergy() {
    try {
      // Get all users with energy state
      const pattern = 'user:*:energy';
      const keys = await redisService.client.keys(pattern);
      
      for (const key of keys) {
        const userId = key.split(':')[1];
        const energyState = await redisService.getUserEnergyState(userId);
        
        if (energyState.current < energyState.max) {
          const newEnergy = await this.calculateCurrentEnergy(userId, energyState);
          
          await redisService.setUserEnergyState(userId, {
            ...energyState,
            current: Math.min(newEnergy, energyState.max),
            lastUpdate: Date.now()
          });
        }
      }
    } catch (error) {
      logger.error('Error regenerating energy:', error);
    }
  }

  async calculateCurrentEnergy(userId, energyState) {
    if (!energyState.lastUpdate) {
      return energyState.current || this.config.baseEnergy;
    }

    const now = Date.now();
    const timeDiff = now - energyState.lastUpdate;
    const hoursElapsed = timeDiff / (1000 * 60 * 60);
    const energyRegen = hoursElapsed * (energyState.regenRate || this.config.energyRegenRate);
    
    return Math.min(
      energyState.current + energyRegen,
      energyState.max || this.config.baseEnergy
    );
  }

  calculateHashrate(minerLevel) {
    return this.config.baseHashrate * minerLevel;
  }

  calculateReward(minerLevel) {
    // Solo mining chance increases with miner level
    const soloChance = Math.min(0.1 + (minerLevel - 1) * 0.1, 0.5); // 10% to 50%
    const isSolo = Math.random() < soloChance;
    
    // Solo blocks give full reward, pool blocks give 50%
    const reward = isSolo ? this.config.baseReward : Math.floor(this.config.baseReward * 0.5);
    
    return { reward, isSolo };
  }

  async generateBlockNumber() {
    const result = await databaseService.query(
      'SELECT COALESCE(MAX(block_number), 0) + 1 as next_block FROM mining_blocks'
    );
    return result.rows[0].next_block;
  }

  generateBlockHash(blockNumber, userId, hashrate) {
    const data = `${blockNumber}-${userId}-${hashrate}-${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async cleanup() {
    try {
      // Remove expired tokens
      await databaseService.query('DELETE FROM user_tokens WHERE expires_at < NOW()');
      
      // Clean up old mining blocks (keep last 1000 per user)
      await databaseService.query(`
        DELETE FROM mining_blocks 
        WHERE id NOT IN (
          SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY mined_at DESC) as rn
            FROM mining_blocks
          ) ranked WHERE rn <= 1000
        )
      `);
      
      logger.info('Mining service cleanup completed');
    } catch (error) {
      logger.error('Error during cleanup:', error);
    }
  }

  async getLeaderboard(limit = 10) {
    try {
      const query = `
        SELECT 
          u.username, u.first_name, u.miner_level,
          COUNT(mb.id) as blocks_mined,
          SUM(mb.reward) as total_rewards,
          MAX(mb.mined_at) as last_mining
        FROM users u
        LEFT JOIN mining_blocks mb ON u.id = mb.user_id
        WHERE u.is_active = true
        GROUP BY u.id, u.username, u.first_name, u.miner_level
        ORDER BY total_rewards DESC NULLS LAST
        LIMIT $1
      `;
      
      const result = await databaseService.query(query, [limit]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get leaderboard:', error);
      throw error;
    }
  }
}

// Create singleton instance
const miningService = new MiningService();

module.exports = miningService;