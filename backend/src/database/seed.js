const databaseService = require('../services/database');
const logger = require('../utils/logger');

const seedData = async () => {
  try {
    await databaseService.initialize();
    
    // Insert admin user with your Telegram ID
    const adminTelegramId = 1651155083;
    
    // Check if admin user already exists
    const existingAdmin = await databaseService.query(
      'SELECT id FROM users WHERE telegram_id = $1',
      [adminTelegramId]
    );
    
    if (existingAdmin.rows.length === 0) {
      // Insert admin user
      await databaseService.query(`
        INSERT INTO users (
          telegram_id, username, first_name, role, 
          aegt_balance, ton_balance, miner_level, 
          energy_capacity, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        adminTelegramId,
        'admin_user',
        'Admin',
        'admin',
        1000000000000, // 1000 AEGT tokens for testing
        1000000000,    // 1 TON for testing
        10,            // High miner level
        10000,         // High energy capacity
        true
      ]);
      
      logger.info(`Admin user created with Telegram ID: ${adminTelegramId}`);
    } else {
      // Update existing user to admin
      await databaseService.query(`
        UPDATE users SET 
          role = 'admin',
          aegt_balance = GREATEST(aegt_balance, $2),
          ton_balance = GREATEST(ton_balance, $3),
          miner_level = GREATEST(miner_level, $4),
          energy_capacity = GREATEST(energy_capacity, $5)
        WHERE telegram_id = $1
      `, [
        adminTelegramId,
        1000000000000, // 1000 AEGT tokens
        1000000000,    // 1 TON
        10,            // High miner level
        10000          // High energy capacity
      ]);
      
      logger.info(`Existing user updated to admin with Telegram ID: ${adminTelegramId}`);
    }
    
    // Insert sample upgrades
    const upgrades = [
      {
        name: 'Basic Miner Upgrade',
        description: 'Increases hashrate by 50 H/s',
        upgrade_type: 'miner',
        level_requirement: 1,
        cost_ton: 100000000, // 0.1 TON
        benefit_value: 50,
        benefit_type: 'hashrate'
      },
      {
        name: 'Advanced Miner Upgrade',
        description: 'Increases hashrate by 150 H/s',
        upgrade_type: 'miner',
        level_requirement: 5,
        cost_ton: 500000000, // 0.5 TON
        benefit_value: 150,
        benefit_type: 'hashrate'
      },
      {
        name: 'Energy Capacity Boost',
        description: 'Increases energy capacity by 500',
        upgrade_type: 'energy',
        level_requirement: 3,
        cost_ton: 200000000, // 0.2 TON
        benefit_value: 500,
        benefit_type: 'energy_capacity'
      },
      {
        name: 'Energy Regeneration Boost',
        description: 'Increases energy regeneration by 100/hour',
        upgrade_type: 'energy',
        level_requirement: 7,
        cost_ton: 800000000, // 0.8 TON
        benefit_value: 100,
        benefit_type: 'energy_regen'
      }
    ];
    
    for (const upgrade of upgrades) {
      // Check if upgrade already exists
      const existing = await databaseService.query(
        'SELECT id FROM upgrades WHERE name = $1',
        [upgrade.name]
      );
      
      if (existing.rows.length === 0) {
        await databaseService.query(`
          INSERT INTO upgrades (
            name, description, upgrade_type, level_requirement,
            cost_ton, benefit_value, benefit_type, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          upgrade.name,
          upgrade.description,
          upgrade.upgrade_type,
          upgrade.level_requirement,
          upgrade.cost_ton,
          upgrade.benefit_value,
          upgrade.benefit_type,
          true
        ]);
        
        logger.info(`Upgrade created: ${upgrade.name}`);
      }
    }
    
    logger.info('Database seeding completed successfully');
    
  } catch (error) {
    logger.error('Database seeding failed:', error);
    throw error;
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedData()
    .then(() => {
      logger.info('Database seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Database seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedData };