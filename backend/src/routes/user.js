const express = require('express');
const router = express.Router();

// Placeholder user routes
router.get('/profile', (req, res) => {
  res.json({ success: true, user: req.user });
});

router.get('/balance', (req, res) => {
  res.json({ 
    success: true, 
    balance: {
      aegt: req.user.aegtBalance,
      ton: req.user.tonBalance
    }
  });
});

module.exports = router;