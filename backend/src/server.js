const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import utilities and middleware
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { authMiddleware } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const miningRoutes = require('./routes/mining');
const upgradeRoutes = require('./routes/upgrade');
const energyRoutes = require('./routes/energy');
const tonRoutes = require('./routes/ton');
const adminRoutes = require('./routes/admin');

// Import services
const databaseService = require('./services/database');
const redisService = require('./services/redis');
const miningService = require('./services/mining');

const app = express();
const PORT = process.env.PORT || 3001; // Match NGINX
const HOST = process.env.HOST || '0.0.0.0';

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'https://aegisum.co.za',
      'http://webapp.aegisum.co.za'
    ];
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) }
  }));
}

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/mining', authMiddleware, miningRoutes);
app.use('/api/upgrades', authMiddleware, upgradeRoutes);
app.use('/api/energy', authMiddleware, energyRoutes);
app.use('/api/ton', authMiddleware, tonRoutes);
app.use('/api/admin', adminRoutes);

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

app.use(errorHandler);

const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  try {
    server.close(async () => {
      logger.info('HTTP server closed');
      await databaseService.close();
      logger.info('Database connections closed');
      await redisService.close();
      logger.info('Redis connections closed');
      await miningService.stop();
      logger.info('Mining service stopped');
      logger.info('Graceful shutdown completed');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

let server;

const startServer = async () => {
  try {
    await databaseService.initialize();
    logger.info('Database initialized');
    await redisService.initialize();
    logger.info('Redis initialized');
    await miningService.initialize();
    logger.info('Mining service initialized');
    server = app.listen(PORT, HOST, () => {
      logger.info(`🚀 Aegisum API server running on ${HOST}:${PORT}`);
      logger.info(`📱 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔗 CORS origins: ${process.env.CORS_ORIGIN}`);
    });
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });
    return server;
  } catch (error) {
    logger.error('Failed to start server:', error.message || error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer().catch((error) => logger.error('Server start failed:', error));
}

module.exports = app;

// Telegram Bot Integration
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TELEGRAM_BOT_TOKEN || '7820209188:AAGWlH9P_49d15934bsyZGQdKE93r9ItWQ4';

// Admin Telegram ID
const ADMIN_TELEGRAM_ID = 1651155083;

let bot;
if (token && process.env.NODE_ENV !== 'test') {
  bot = new TelegramBot(token, { polling: true });
  
  // Welcome message with WebApp button
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    const welcomeMessage = `🎮 Welcome to Aegisum Tap2Earn!
    
🚀 Start mining AEGT tokens with your virtual miner
⚡ Upgrade your equipment with TON payments
💎 Earn rewards through passive mining
    
Click the button below to launch the WebApp:`;
    
    const options = {
      reply_markup: {
        inline_keyboard: [[
          {
            text: '🎮 Launch Aegisum WebApp',
            web_app: { url: 'https://webapp.aegisum.co.za' }
          }
        ]]
      }
    };
    
    bot.sendMessage(chatId, welcomeMessage, options);
    
    // Log user interaction
    logger.info(`User ${userId} started the bot`);
  });
  
  // Admin commands
  bot.onText(/\/admin/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (userId !== ADMIN_TELEGRAM_ID) {
      bot.sendMessage(chatId, '❌ Access denied. Admin privileges required.');
      return;
    }
    
    try {
      // Get system stats
      const userCount = await databaseService.query('SELECT COUNT(*) as count FROM users');
      const activeMiners = await databaseService.query('SELECT COUNT(*) as count FROM active_mining');
      const totalBlocks = await databaseService.query('SELECT COUNT(*) as count FROM mining_blocks');
      
      const adminMessage = `🔧 Admin Panel - Aegisum Stats
      
👥 Total Users: ${userCount.rows[0].count}
⛏️ Active Miners: ${activeMiners.rows[0].count}
📦 Total Blocks Mined: ${totalBlocks.rows[0].count}
      
Available commands:
/stats - Detailed statistics
/users - User management
/broadcast - Send message to all users`;
      
      bot.sendMessage(chatId, adminMessage);
    } catch (error) {
      logger.error('Admin command error:', error);
      bot.sendMessage(chatId, '❌ Error fetching admin data');
    }
  });
  
  // Detailed stats for admin
  bot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (userId !== ADMIN_TELEGRAM_ID) {
      bot.sendMessage(chatId, '❌ Access denied. Admin privileges required.');
      return;
    }
    
    try {
      const stats = await databaseService.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as new_users_24h,
          COUNT(CASE WHEN last_activity > NOW() - INTERVAL '24 hours' THEN 1 END) as active_users_24h,
          SUM(aegt_balance) as total_aegt,
          AVG(miner_level) as avg_miner_level
        FROM users
      `);
      
      const miningStats = await databaseService.query(`
        SELECT 
          COUNT(*) as total_blocks,
          SUM(reward) as total_rewards,
          AVG(hashrate) as avg_hashrate
        FROM mining_blocks
        WHERE mined_at > NOW() - INTERVAL '24 hours'
      `);
      
      const row = stats.rows[0];
      const miningRow = miningStats.rows[0];
      
      const statsMessage = `📊 Detailed Statistics (24h)
      
👥 Users:
• Total: ${row.total_users}
• New (24h): ${row.new_users_24h}
• Active (24h): ${row.active_users_24h}
• Avg Miner Level: ${parseFloat(row.avg_miner_level || 0).toFixed(1)}

⛏️ Mining (24h):
• Blocks Mined: ${miningRow.total_blocks || 0}
• Total Rewards: ${(miningRow.total_rewards || 0) / 1000000000} AEGT
• Avg Hashrate: ${parseFloat(miningRow.avg_hashrate || 0).toFixed(1)} H/s

💰 Economy:
• Total AEGT in circulation: ${(row.total_aegt || 0) / 1000000000} AEGT`;
      
      bot.sendMessage(chatId, statsMessage);
    } catch (error) {
      logger.error('Stats command error:', error);
      bot.sendMessage(chatId, '❌ Error fetching statistics');
    }
  });
  
  // Help command
  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    
    const helpMessage = `ℹ️ Aegisum Tap2Earn Help
    
🎮 How to play:
1. Launch the WebApp using /start
2. Your miner starts automatically
3. Earn AEGT tokens every 3 minutes
4. Upgrade your miner with TON
5. Manage your energy levels

💡 Commands:
/start - Launch the game
/help - Show this help message
/stats - Your personal statistics

🔗 Links:
• Website: aegisum.co.za
• Support: @AegisumSupport`;
    
    bot.sendMessage(chatId, helpMessage);
  });
  
  // Handle all other messages
  bot.on('message', (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;
    
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, '🎮 Welcome to Aegisum! Use /start to launch the WebApp or /help for more information.');
  });
  
  logger.info('Telegram bot initialized successfully');
}
