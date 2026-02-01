const express = require('express');
const { registerUser, loginUser, forgotPassword, resetPassword, changePassword, getProfile, updateProfile } = require('../controllers/userController');
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

module.exports = router;
