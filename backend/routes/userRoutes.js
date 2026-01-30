const express = require('express');
const { registerUser, loginUser, forgotPassword, resetPassword, changePassword } = require('../controllers/userController');
const router = express.Router();

const protect = require("../middlewares/authMiddleware");

// Routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', protect, changePassword);

module.exports = router;
