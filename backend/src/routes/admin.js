const express = require('express');
const { adminAuth } = require('../middleware/auth');
const router = express.Router();

// Apply admin auth to all routes
router.use(adminAuth);

router.get('/stats', (req, res) => {
  res.json({ success: true, stats: {} });
});

router.get('/users', (req, res) => {
  res.json({ success: true, users: [] });
});

module.exports = router;