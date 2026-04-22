const express = require('express');
const { registerUser, loginUser, forgotPassword, resetPassword, changePassword, getProfile, updateProfile } = require('../controllers/userController');
const { setup2FA, verify2FA, disable2FA, get2FAStatus } = require('../controllers/twoFactorController');
const router = express.Router();

const protect = require("../middlewares/authMiddleware");

// Routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.post('/change-password', protect, changePassword);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

// 2FA
router.get('/2fa/status',  protect, get2FAStatus);
router.post('/2fa/setup',  protect, setup2FA);
router.post('/2fa/verify', protect, verify2FA);
router.post('/2fa/disable', protect, disable2FA);

module.exports = router;
