const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
    getClanData,
    updateClanInfo,
    getEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    updateFund,
    migrateShrine,
    getVisibilitySettings,
    updateVisibilitySettings,
} = require('../controllers/clanController');

// Thông tin dòng họ
router.get('/', authMiddleware, getClanData);
router.put('/info', authMiddleware, updateClanInfo);

// Sự kiện
router.get('/events', authMiddleware, getEvents);
router.post('/events', authMiddleware, addEvent);
router.put('/events/:id', authMiddleware, updateEvent);
router.delete('/events/:id', authMiddleware, deleteEvent);

// Quỹ
router.put('/fund', authMiddleware, updateFund);

// Migration: bật shrine cho tất cả thành viên đã mất
router.post('/migrate-shrine', authMiddleware, migrateShrine);

// Cài đặt hiển thị thông tin
router.get('/visibility', authMiddleware, getVisibilitySettings);
router.put('/visibility', authMiddleware, updateVisibilitySettings);

module.exports = router;
