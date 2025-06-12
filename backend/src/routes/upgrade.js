const express = require('express');
const router = express.Router();

// Placeholder upgrade routes
router.get('/', (req, res) => {
  res.json({ success: true, upgrades: [] });
});

router.post('/:id/purchase', (req, res) => {
  res.json({ success: true, message: 'Upgrade purchased' });
});

module.exports = router;