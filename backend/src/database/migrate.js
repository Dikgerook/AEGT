const databaseService = require('../services/database');
const logger = require('../utils/logger');

const migrations = [
  {
    version: 1,
    name: 'create_users_table',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        username VARCHAR(50),
        first_name VARCHAR(50),
        last_name VARCHAR(50),
        language_code VARCHAR(10) DEFAULT 'en',
        aegt_balance BIGINT DEFAULT 0,
        ton_balance BIGINT DEFAULT 0,
        miner_level INTEGER DEFAULT 1,
        energy_capacity INTEGER DEFAULT 1000,
        role VARCHAR(20) DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_activity TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
      CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity);
    `
  },
  {
    version: 2,
    name: 'create_user_tokens_table',
    sql: `
      CREATE TABLE IF NOT EXISTS user_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(64) NOT NULL,
        token_type VARCHAR(20) DEFAULT 'access',
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, token_type)
      );
      
      CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_tokens_hash ON user_tokens(token_hash);
      CREATE INDEX IF NOT EXISTS idx_user_tokens_expires ON user_tokens(expires_at);
    `
  },
  {
    version: 3,
    name: 'create_mining_blocks_table',
    sql: `
      CREATE TABLE IF NOT EXISTS mining_blocks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        block_number BIGINT NOT NULL,
        block_hash VARCHAR(64) NOT NULL,
        hashrate INTEGER NOT NULL,
        reward BIGINT NOT NULL,
        treasury_fee BIGINT DEFAULT 0,
        is_solo BOOLEAN DEFAULT false,
        energy_used INTEGER NOT NULL,
        mined_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_mining_blocks_user_id ON mining_blocks(user_id);
      CREATE INDEX IF NOT EXISTS idx_mining_blocks_block_number ON mining_blocks(block_number);
      CREATE INDEX IF NOT EXISTS idx_mining_blocks_mined_at ON mining_blocks(mined_at);
      CREATE INDEX IF NOT EXISTS idx_mining_blocks_reward ON mining_blocks(reward);
    `
  },
  {
    version: 4,
    name: 'create_active_mining_table',
    sql: `
      CREATE TABLE IF NOT EXISTS active_mining (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        started_at TIMESTAMP NOT NULL,
        block_number BIGINT NOT NULL,
        hashrate INTEGER NOT NULL,
        energy_used INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_active_mining_started_at ON active_mining(started_at);
    `
  },
  {
    version: 5,
    name: 'create_upgrades_table',
    sql: `
      CREATE TABLE IF NOT EXISTS upgrades (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        upgrade_type VARCHAR(50) NOT NULL, -- 'miner', 'energy', 'special'
        level_requirement INTEGER DEFAULT 1,
        cost_ton BIGINT NOT NULL,
        benefit_value INTEGER NOT NULL,
        benefit_type VARCHAR(50) NOT NULL, -- 'hashrate', 'energy_capacity', 'energy_regen'
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_upgrades_type ON upgrades(upgrade_type);
      CREATE INDEX IF NOT EXISTS idx_upgrades_active ON upgrades(is_active);
    `
  },
  {
    version: 6,
    name: 'create_user_upgrades_table',
    sql: `
      CREATE TABLE IF NOT EXISTS user_upgrades (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        upgrade_id INTEGER REFERENCES upgrades(id) ON DELETE CASCADE,
        purchased_at TIMESTAMP DEFAULT NOW(),
        ton_paid BIGINT NOT NULL,
        transaction_hash VARCHAR(64),
        UNIQUE(user_id, upgrade_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_user_upgrades_user_id ON user_upgrades(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_upgrades_purchased_at ON user_upgrades(purchased_at);
    `
  },
  {
    version: 7,
    name: 'create_energy_refills_table',
    sql: `
      CREATE TABLE IF NOT EXISTS energy_refills (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        energy_amount INTEGER NOT NULL,
        ton_cost BIGINT NOT NULL,
        transaction_hash VARCHAR(64),
        refilled_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_energy_refills_user_id ON energy_refills(user_id);
      CREATE INDEX IF NOT EXISTS idx_energy_refills_refilled_at ON energy_refills(refilled_at);
    `
  },
  {
    version: 8,
    name: 'create_ton_transactions_table',
    sql: `
      CREATE TABLE IF NOT EXISTS ton_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        transaction_hash VARCHAR(64) UNIQUE NOT NULL,
        transaction_type VARCHAR(50) NOT NULL, -- 'upgrade', 'energy_refill', 'withdrawal'
        amount BIGINT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'failed'
        block_number BIGINT,
        created_at TIMESTAMP DEFAULT NOW(),
        confirmed_at TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_ton_transactions_user_id ON ton_transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_ton_transactions_hash ON ton_transactions(transaction_hash);
      CREATE INDEX IF NOT EXISTS idx_ton_transactions_status ON ton_transactions(status);
      CREATE INDEX IF NOT EXISTS idx_ton_transactions_type ON ton_transactions(transaction_type);
    `
  },
  {
    version: 9,
    name: 'create_referrals_table',
    sql: `
      CREATE TABLE IF NOT EXISTS referrals (
        id SERIAL PRIMARY KEY,
        referrer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        referred_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        reward_claimed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(referred_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
      CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
    `
  },
  {
    version: 10,
    name: 'create_system_config_table',
    sql: `
      CREATE TABLE IF NOT EXISTS system_config (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      -- Insert default configuration
      INSERT INTO system_config (key, value, description) VALUES
      ('treasury_fee_percentage', '10', 'Treasury fee percentage for mining rewards'),
      ('base_mining_reward', '1000000000', 'Base mining reward in smallest AEGT units'),
      ('energy_regen_rate', '250', 'Energy regeneration rate per hour'),
      ('mining_block_time', '180000', 'Mining block time in milliseconds'),
      ('ton_to_energy_rate', '1000', 'Energy amount per 1 TON for refills')
      ON CONFLICT (key) DO NOTHING;
    `
  }
];

async function runMigrations() {
  try {
    await databaseService.initialize();
    
    // Create migrations table if it doesn't exist
    await databaseService.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Get executed migrations
    const executedResult = await databaseService.query(
      'SELECT version FROM migrations ORDER BY version'
    );
    const executedVersions = new Set(executedResult.rows.map(row => row.version));
    
    // Run pending migrations
    for (const migration of migrations) {
      if (!executedVersions.has(migration.version)) {
        logger.info(`Running migration ${migration.version}: ${migration.name}`);
        
        await databaseService.transaction(async (client) => {
          // Execute migration SQL
          await client.query(migration.sql);
          
          // Record migration as executed
          await client.query(
            'INSERT INTO migrations (version, name) VALUES ($1, $2)',
            [migration.version, migration.name]
          );
        });
        
        logger.info(`Migration ${migration.version} completed successfully`);
      }
    }
    
    logger.info('All migrations completed successfully');
    
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Database migration completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Database migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations, migrations };