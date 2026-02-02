const express = require('express');
const router = express.Router();
const protect = require('../middlewares/authMiddleware');
const {
    createSuggestion,
    getSuggestions,
    countPendingSuggestions,
    approveSuggestion,
    rejectSuggestion,
    deleteSuggestion,
} = require('../controllers/suggestionController');

// Public - không cần đăng nhập
router.post('/', createSuggestion);

// Protected - cần đăng nhập
router.get('/', protect, getSuggestions);
router.get('/count', protect, countPendingSuggestions);
router.put('/:id/approve', protect, approveSuggestion);
router.put('/:id/reject', protect, rejectSuggestion);
router.delete('/:id', protect, deleteSuggestion);

module.exports = router;