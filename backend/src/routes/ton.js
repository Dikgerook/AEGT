const express = require('express');
const router = express.Router();

// Placeholder TON routes
router.post('/connect', (req, res) => {
  res.json({ success: true, message: 'Wallet connected' });
});

router.get('/balance', (req, res) => {
  res.json({ success: true, balance: '0' });
});

module.exports = router;