const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import utilities and middleware
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');

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
app.use('/api/admin', authMiddleware, adminRoutes);

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

const startServer = async () => {
  try {
    await databaseService.initialize();
    logger.info('Database initialized');
    await redisService.initialize();
    logger.info('Redis initialized');
    await miningService.initialize();
    logger.info('Mining service initialized');
    const server = app.listen(PORT, HOST, () => {
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
const token = process.env.TELEGRAM_TOKEN || '7820209188:AAGWlH9P_49d15934bsyZGQdKE93r9ItWQ4';
const bot = new TelegramBot(token, { polling: true });
bot.on('message', (msg) => {
  bot.sendMessage(msg.chat.id, 'Welcome to Aegisum Tap2Earn!');
});
