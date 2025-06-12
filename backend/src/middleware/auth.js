const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const databaseService = require('../services/database');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const userQuery = `
        SELECT 
          id, telegram_id, username, first_name, last_name,
          aegt_balance, ton_balance, miner_level, energy_capacity,
          created_at, updated_at, is_active
        FROM users 
        WHERE id = $1 AND is_active = true
      `;
      
      const result = await databaseService.query(userQuery, [decoded.userId]);
      
      if (result.rows.length === 0) {
        return res.status(401).json({
          error: 'Invalid token. User not found.',
          code: 'USER_NOT_FOUND'
        });
      }

      const user = result.rows[0];
      
      // Check if token is still valid (not revoked)
      const tokenQuery = `
        SELECT id FROM user_tokens 
        WHERE user_id = $1 AND token_hash = $2 AND expires_at > NOW()
      `;
      
      const tokenHash = require('crypto')
        .createHash('sha256')
        .update(token)
        .digest('hex');
      
      const tokenResult = await databaseService.query(tokenQuery, [user.id, tokenHash]);
      
      if (tokenResult.rows.length === 0) {
        return res.status(401).json({
          error: 'Token expired or revoked.',
          code: 'TOKEN_EXPIRED'
        });
      }

      // Add user to request object
      req.user = {
        id: user.id,
        telegramId: user.telegram_id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        aegtBalance: user.aegt_balance,
        tonBalance: user.ton_balance,
        minerLevel: user.miner_level,
        energyCapacity: user.energy_capacity,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };

      // Update last activity
      await databaseService.query(
        'UPDATE users SET last_activity = NOW() WHERE id = $1',
        [user.id]
      );

      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired.',
          code: 'TOKEN_EXPIRED'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Invalid token.',
          code: 'INVALID_TOKEN'
        });
      } else {
        throw jwtError;
      }
    }
  } catch (error) {
    logger.logError(error, req);
    return res.status(500).json({
      error: 'Internal server error during authentication.',
      code: 'AUTH_ERROR'
    });
  }
};

// Optional auth middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    await authMiddleware(req, res, next);
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

// Admin auth middleware
const adminAuth = async (req, res, next) => {
  try {
    // First run regular auth
    await authMiddleware(req, res, () => {});
    
    // Check if user is admin
    const adminQuery = `
      SELECT role FROM users WHERE id = $1 AND role = 'admin'
    `;
    
    const result = await databaseService.query(adminQuery, [req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(403).json({
        error: 'Access denied. Admin privileges required.',
        code: 'ADMIN_REQUIRED'
      });
    }

    next();
  } catch (error) {
    logger.logError(error, req);
    return res.status(500).json({
      error: 'Internal server error during admin authentication.',
      code: 'ADMIN_AUTH_ERROR'
    });
  }
};

// Rate limiting by user
const userRateLimit = (maxRequests = 60, windowMs = 60000) => {
  const requests = new Map();
  
  return (req, res, next) => {
    if (!req.user) {
      return next();
    }
    
    const userId = req.user.id;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    if (requests.has(userId)) {
      const userRequests = requests.get(userId);
      const validRequests = userRequests.filter(time => time > windowStart);
      requests.set(userId, validRequests);
    }
    
    // Check current requests
    const userRequests = requests.get(userId) || [];
    
    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    // Add current request
    userRequests.push(now);
    requests.set(userId, userRequests);
    
    next();
  };
};

// Telegram WebApp data validation
const validateTelegramWebApp = (req, res, next) => {
  try {
    const { initData } = req.body;
    
    if (!initData) {
      return res.status(400).json({
        error: 'Telegram WebApp init data required.',
        code: 'MISSING_INIT_DATA'
      });
    }

    // Parse init data
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');
    
    // Create data check string
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    // Verify hash
    const secretKey = require('crypto')
      .createHmac('sha256', 'WebAppData')
      .update(process.env.TELEGRAM_BOT_TOKEN)
      .digest();
    
    const calculatedHash = require('crypto')
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    if (calculatedHash !== hash) {
      logger.logSecurity('Invalid Telegram WebApp data', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        initData: initData.substring(0, 100) + '...'
      });
      
      return res.status(401).json({
        error: 'Invalid Telegram WebApp data.',
        code: 'INVALID_TELEGRAM_DATA'
      });
    }

    // Parse user data
    const userParam = urlParams.get('user');
    if (userParam) {
      req.telegramUser = JSON.parse(userParam);
    }

    next();
  } catch (error) {
    logger.logError(error, req);
    return res.status(400).json({
      error: 'Invalid Telegram WebApp data format.',
      code: 'INVALID_DATA_FORMAT'
    });
  }
};

module.exports = {
  authMiddleware,
  optionalAuth,
  adminAuth,
  userRateLimit,
  validateTelegramWebApp
};