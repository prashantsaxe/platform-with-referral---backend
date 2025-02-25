const express = require('express');
const { register, login, forgotPassword } = require('../controllers/authController');
const { getReferrals, getReferralStats } = require('../controllers/referralController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.get('/referrals', authMiddleware, getReferrals);
router.get('/referral-stats', authMiddleware, getReferralStats);

module.exports = router;