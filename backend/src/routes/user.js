const express = require('express');
const router = express.Router();

/**
 * @route GET /api/user/profile
 * @desc Get current user profile
 * @access Private
 */
router.get('/profile', (req, res) => {
  res.json({ success: true, user: req.user });
});

/**
 * @route GET /api/user/balance
 * @desc Get current user's token balances
 * @access Private
 */
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
