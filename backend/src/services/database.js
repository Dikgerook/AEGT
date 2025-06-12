const { Pool } = require('pg');
const logger = require('../utils/logger');

class DatabaseService {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  async initialize() {
    try {
      // Create connection pool
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
        connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;
      logger.info('Database connection established');

      // Handle pool errors
      this.pool.on('error', (err) => {
        logger.error('Unexpected error on idle client', err);
        this.isConnected = false;
      });

      return this.pool;
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  async query(text, params = []) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (duration > 1000) {
        logger.warn('Slow query detected', {
          query: text,
          duration: `${duration}ms`,
          rowCount: result.rowCount
        });
      }
      
      return result;
    } catch (error) {
      logger.error('Database query error', {
        query: text,
        params,
        error: error.message
      });
      throw error;
    }
  }

  async transaction(callback) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getClient() {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }
    return await this.pool.connect();
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      logger.info('Database connection closed');
    }
  }

  // Health check
  async healthCheck() {
    try {
      const result = await this.query('SELECT 1 as health');
      return result.rows[0].health === 1;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  // Get connection info
  getConnectionInfo() {
    if (!this.pool) {
      return null;
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      isConnected: this.isConnected
    };
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

module.exports = databaseService;