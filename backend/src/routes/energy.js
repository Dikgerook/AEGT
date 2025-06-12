const express = require('express');
const miningService = require('../services/mining');
const redisService = require('../services/redis');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.get('/status', asyncHandler(async (req, res) => {
  const energyState = await redisService.getUserEnergyState(req.user.id);
  const currentEnergy = await miningService.calculateCurrentEnergy(req.user.id, energyState);
  
  res.json({
    success: true,
    data: {
      current: Math.floor(currentEnergy),
      max: energyState.max || 1000,
      regenRate: energyState.regenRate || 250,
      lastUpdate: energyState.lastUpdate
    }
  });
}));

router.post('/refill', (req, res) => {
  res.json({ success: true, message: 'Energy refilled' });
});

module.exports = router;