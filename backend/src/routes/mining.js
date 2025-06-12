const express = require('express');
const { body, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const miningService = require('../services/mining');
const databaseService = require('../services/database');
const logger = require('../utils/logger');
const { asyncHandler, ValidationError } = require('../middleware/errorHandler');
const { userRateLimit } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for mining operations
const miningLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each user to 30 requests per minute
  message: {
    error: 'Too many mining requests, please try again later.',
    code: 'MINING_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to mining routes
router.use(miningLimiter);
router.use(userRateLimit(60, 60000)); // 60 requests per minute per user

/**
 * @route POST /api/mining/start
 * @desc Start mining operation
 * @access Private
 */
router.post('/start', asyncHandler(async (req, res) => {
  const result = await miningService.startMining(req.user.id);
  
  res.json({
    success: true,
    message: 'Mining started successfully',
    data: result
  });
}));

/**
 * @route POST /api/mining/stop
 * @desc Stop mining operation
 * @access Private
 */
router.post('/stop', asyncHandler(async (req, res) => {
  const result = await miningService.stopMining(req.user.id);
  
  res.json({
    success: true,
    message: 'Mining stopped successfully',
    data: result
  });
}));

/**
 * @route GET /api/mining/status
 * @desc Get current mining status
 * @access Private
 */
router.get('/status', asyncHandler(async (req, res) => {
  const status = await miningService.getMiningStatus(req.user.id);
  
  res.json({
    success: true,
    data: status
  });
}));

/**
 * @route GET /api/mining/history
 * @desc Get mining history
 * @access Private
 */
router.get('/history', 
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('type').optional().isIn(['all', 'solo', 'pool']).withMessage('Type must be all, solo, or pool')
  ],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const type = req.query.type || 'all';
    const offset = (page - 1) * limit;

    // Build query based on type filter
    let whereClause = 'WHERE user_id = $1';
    const queryParams = [req.user.id];

    if (type === 'solo') {
      whereClause += ' AND is_solo = true';
    } else if (type === 'pool') {
      whereClause += ' AND is_solo = false';
    }

    // Get mining blocks
    const blocksQuery = `
      SELECT 
        id, block_number, block_hash, hashrate, reward, treasury_fee,
        is_solo, energy_used, mined_at
      FROM mining_blocks 
      ${whereClause}
      ORDER BY mined_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    queryParams.push(limit, offset);

    const blocksResult = await databaseService.query(blocksQuery, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM mining_blocks 
      ${whereClause}
    `;

    const countResult = await databaseService.query(countQuery, [req.user.id]);
    const total = parseInt(countResult.rows[0].total);

    // Calculate statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_blocks,
        SUM(reward) as total_rewards,
        SUM(CASE WHEN is_solo THEN 1 ELSE 0 END) as solo_blocks,
        AVG(hashrate) as avg_hashrate,
        MAX(mined_at) as last_mining
      FROM mining_blocks 
      WHERE user_id = $1
    `;

    const statsResult = await databaseService.query(statsQuery, [req.user.id]);
    const stats = statsResult.rows[0];

    res.json({
      success: true,
      data: {
        blocks: blocksResult.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        stats: {
          totalBlocks: parseInt(stats.total_blocks) || 0,
          totalRewards: stats.total_rewards || '0',
          soloBlocks: parseInt(stats.solo_blocks) || 0,
          poolBlocks: parseInt(stats.total_blocks) - parseInt(stats.solo_blocks) || 0,
          avgHashrate: Math.round(parseFloat(stats.avg_hashrate)) || 0,
          lastMining: stats.last_mining
        }
      }
    });
  })
);

/**
 * @route GET /api/mining/blocks
 * @desc Get recent mining blocks (all users)
 * @access Private
 */
router.get('/blocks',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
  ],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const limit = parseInt(req.query.limit) || 10;

    const query = `
      SELECT 
        mb.id, mb.block_number, mb.block_hash, mb.hashrate, mb.reward,
        mb.is_solo, mb.energy_used, mb.mined_at,
        u.username, u.first_name, u.miner_level
      FROM mining_blocks mb
      JOIN users u ON mb.user_id = u.id
      ORDER BY mb.mined_at DESC
      LIMIT $1
    `;

    const result = await databaseService.query(query, [limit]);

    res.json({
      success: true,
      data: {
        blocks: result.rows.map(block => ({
          id: block.id,
          blockNumber: block.block_number,
          hash: block.block_hash,
          hashrate: block.hashrate,
          reward: block.reward,
          isSolo: block.is_solo,
          energyUsed: block.energy_used,
          minedAt: block.mined_at,
          miner: {
            username: block.username,
            firstName: block.first_name,
            level: block.miner_level
          }
        }))
      }
    });
  })
);

/**
 * @route POST /api/mining/claim/:blockId
 * @desc Claim mining reward (if not auto-claimed)
 * @access Private
 */
router.post('/claim/:blockId',
  [
    body('blockId').isInt({ min: 1 }).withMessage('Valid block ID required')
  ],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const blockId = parseInt(req.params.blockId);

    // Check if block exists and belongs to user
    const blockQuery = `
      SELECT id, reward, user_id, mined_at
      FROM mining_blocks 
      WHERE id = $1 AND user_id = $2
    `;

    const blockResult = await databaseService.query(blockQuery, [blockId, req.user.id]);

    if (blockResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Mining block not found',
        code: 'BLOCK_NOT_FOUND'
      });
    }

    const block = blockResult.rows[0];

    // For now, rewards are auto-claimed, so this endpoint just returns the block info
    // In future versions, this could handle manual claiming logic

    res.json({
      success: true,
      message: 'Reward already claimed',
      data: {
        blockId: block.id,
        reward: block.reward,
        minedAt: block.mined_at
      }
    });
  })
);

/**
 * @route GET /api/mining/leaderboard
 * @desc Get mining leaderboard
 * @access Private
 */
router.get('/leaderboard',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const limit = parseInt(req.query.limit) || 10;
    const leaderboard = await miningService.getLeaderboard(limit);

    res.json({
      success: true,
      data: {
        leaderboard: leaderboard.map((entry, index) => ({
          rank: index + 1,
          username: entry.username || 'Anonymous',
          firstName: entry.first_name,
          minerLevel: entry.miner_level,
          blocksMined: parseInt(entry.blocks_mined) || 0,
          totalRewards: entry.total_rewards || '0',
          lastMining: entry.last_mining
        }))
      }
    });
  })
);

/**
 * @route GET /api/mining/stats
 * @desc Get global mining statistics
 * @access Private
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const statsQuery = `
    SELECT 
      COUNT(DISTINCT mb.user_id) as active_miners,
      COUNT(mb.id) as total_blocks,
      SUM(mb.reward) as total_rewards,
      AVG(mb.hashrate) as avg_hashrate,
      SUM(CASE WHEN mb.is_solo THEN 1 ELSE 0 END) as solo_blocks,
      MAX(mb.mined_at) as last_block_time
    FROM mining_blocks mb
    WHERE mb.mined_at > NOW() - INTERVAL '24 hours'
  `;

  const statsResult = await databaseService.query(statsQuery);
  const stats = statsResult.rows[0];

  // Get current active miners
  const activeMinersQuery = `
    SELECT COUNT(*) as current_active
    FROM active_mining
  `;

  const activeResult = await databaseService.query(activeMinersQuery);
  const currentActive = parseInt(activeResult.rows[0].current_active) || 0;

  res.json({
    success: true,
    data: {
      currentActiveMiners: currentActive,
      last24Hours: {
        activeMiners: parseInt(stats.active_miners) || 0,
        totalBlocks: parseInt(stats.total_blocks) || 0,
        totalRewards: stats.total_rewards || '0',
        avgHashrate: Math.round(parseFloat(stats.avg_hashrate)) || 0,
        soloBlocks: parseInt(stats.solo_blocks) || 0,
        poolBlocks: (parseInt(stats.total_blocks) || 0) - (parseInt(stats.solo_blocks) || 0),
        lastBlockTime: stats.last_block_time
      }
    }
  });
}));

module.exports = router;