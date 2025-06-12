const Redis = require('ioredis');
const logger = require('../utils/logger');

class RedisService {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.publisher = null;
    this.isConnected = false;
  }

  async initialize() {
    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        family: 4, // IPv4
        db: 0,
      };

      // Main client for general operations
      this.client = new Redis(redisConfig);
      
      // Separate clients for pub/sub
      this.subscriber = new Redis(redisConfig);
      this.publisher = new Redis(redisConfig);

      // Connect all clients
      await Promise.all([
        this.client.connect(),
        this.subscriber.connect(),
        this.publisher.connect()
      ]);

      this.isConnected = true;
      logger.info('Redis connections established');

      // Handle connection events
      this.client.on('error', (err) => {
        logger.error('Redis client error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
      });

      this.client.on('close', () => {
        logger.warn('Redis client connection closed');
        this.isConnected = false;
      });

      return this.client;
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      throw error;
    }
  }

  // Basic operations
  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis GET error:', { key, error: error.message });
      return null;
    }
  }

  async set(key, value, ttl = null) {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.error('Redis SET error:', { key, error: error.message });
      return false;
    }
  }

  async del(key) {
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      logger.error('Redis DEL error:', { key, error: error.message });
      return false;
    }
  }

  async exists(key) {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', { key, error: error.message });
      return false;
    }
  }

  async expire(key, ttl) {
    try {
      const result = await this.client.expire(key, ttl);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXPIRE error:', { key, ttl, error: error.message });
      return false;
    }
  }

  // Hash operations
  async hget(key, field) {
    try {
      const value = await this.client.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis HGET error:', { key, field, error: error.message });
      return null;
    }
  }

  async hset(key, field, value) {
    try {
      const serialized = JSON.stringify(value);
      await this.client.hset(key, field, serialized);
      return true;
    } catch (error) {
      logger.error('Redis HSET error:', { key, field, error: error.message });
      return false;
    }
  }

  async hgetall(key) {
    try {
      const hash = await this.client.hgetall(key);
      const result = {};
      for (const [field, value] of Object.entries(hash)) {
        try {
          result[field] = JSON.parse(value);
        } catch {
          result[field] = value;
        }
      }
      return result;
    } catch (error) {
      logger.error('Redis HGETALL error:', { key, error: error.message });
      return {};
    }
  }

  async hdel(key, field) {
    try {
      const result = await this.client.hdel(key, field);
      return result > 0;
    } catch (error) {
      logger.error('Redis HDEL error:', { key, field, error: error.message });
      return false;
    }
  }

  // List operations
  async lpush(key, value) {
    try {
      const serialized = JSON.stringify(value);
      const result = await this.client.lpush(key, serialized);
      return result;
    } catch (error) {
      logger.error('Redis LPUSH error:', { key, error: error.message });
      return 0;
    }
  }

  async rpop(key) {
    try {
      const value = await this.client.rpop(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis RPOP error:', { key, error: error.message });
      return null;
    }
  }

  async lrange(key, start, stop) {
    try {
      const values = await this.client.lrange(key, start, stop);
      return values.map(value => {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      });
    } catch (error) {
      logger.error('Redis LRANGE error:', { key, start, stop, error: error.message });
      return [];
    }
  }

  // Set operations
  async sadd(key, member) {
    try {
      const result = await this.client.sadd(key, member);
      return result > 0;
    } catch (error) {
      logger.error('Redis SADD error:', { key, member, error: error.message });
      return false;
    }
  }

  async srem(key, member) {
    try {
      const result = await this.client.srem(key, member);
      return result > 0;
    } catch (error) {
      logger.error('Redis SREM error:', { key, member, error: error.message });
      return false;
    }
  }

  async smembers(key) {
    try {
      return await this.client.smembers(key);
    } catch (error) {
      logger.error('Redis SMEMBERS error:', { key, error: error.message });
      return [];
    }
  }

  // Pub/Sub operations
  async publish(channel, message) {
    try {
      const serialized = JSON.stringify(message);
      const result = await this.publisher.publish(channel, serialized);
      return result;
    } catch (error) {
      logger.error('Redis PUBLISH error:', { channel, error: error.message });
      return 0;
    }
  }

  async subscribe(channel, callback) {
    try {
      await this.subscriber.subscribe(channel);
      this.subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const parsed = JSON.parse(message);
            callback(parsed);
          } catch {
            callback(message);
          }
        }
      });
      return true;
    } catch (error) {
      logger.error('Redis SUBSCRIBE error:', { channel, error: error.message });
      return false;
    }
  }

  // Utility methods
  async flushUserData(userId) {
    try {
      const pattern = `user:${userId}:*`;
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return true;
    } catch (error) {
      logger.error('Redis flush user data error:', { userId, error: error.message });
      return false;
    }
  }

  async getUserMiningState(userId) {
    const key = `user:${userId}:mining`;
    return await this.hgetall(key);
  }

  async setUserMiningState(userId, state) {
    const key = `user:${userId}:mining`;
    const pipeline = this.client.pipeline();
    
    for (const [field, value] of Object.entries(state)) {
      pipeline.hset(key, field, JSON.stringify(value));
    }
    
    await pipeline.exec();
    return true;
  }

  async getUserEnergyState(userId) {
    const key = `user:${userId}:energy`;
    return await this.hgetall(key);
  }

  async setUserEnergyState(userId, state) {
    const key = `user:${userId}:energy`;
    const pipeline = this.client.pipeline();
    
    for (const [field, value] of Object.entries(state)) {
      pipeline.hset(key, field, JSON.stringify(value));
    }
    
    await pipeline.exec();
    return true;
  }

  // Health check
  async healthCheck() {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }

  async close() {
    try {
      if (this.client) await this.client.quit();
      if (this.subscriber) await this.subscriber.quit();
      if (this.publisher) await this.publisher.quit();
      
      this.isConnected = false;
      logger.info('Redis connections closed');
    } catch (error) {
      logger.error('Error closing Redis connections:', error);
    }
  }
}

// Create singleton instance
const redisService = new RedisService();

module.exports = redisService;