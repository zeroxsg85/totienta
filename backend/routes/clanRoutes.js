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
    getClanPublic,
} = require('../controllers/clanController');
const {
    getFunds, createFund, updateFund: updateClanFund, deleteFund,
    getTransactions, addTransaction, updateTransaction, deleteTransaction,
    getTransactionsPublic,
} = require('../controllers/fundController');

// Public – xem qua viewCode (không cần đăng nhập)
router.get('/public/:viewCode', getClanPublic);
router.get('/public/:viewCode/funds/:id/transactions', getTransactionsPublic);

// Thông tin dòng họ
router.get('/', authMiddleware, getClanData);
router.put('/info', authMiddleware, updateClanInfo);

// Sự kiện
router.get('/events', authMiddleware, getEvents);
router.post('/events', authMiddleware, addEvent);
router.put('/events/:id', authMiddleware, updateEvent);
router.delete('/events/:id', authMiddleware, deleteEvent);

// Quỹ (legacy – giữ lại cho backward compat)
router.put('/fund', authMiddleware, updateFund);

// ── Quỹ dòng họ (multi-fund) ───────────────────────────────────────────────────
router.get('/funds',     authMiddleware, getFunds);
router.post('/funds',    authMiddleware, createFund);
router.put('/funds/:id', authMiddleware, updateClanFund);
router.delete('/funds/:id', authMiddleware, deleteFund);

// Giao dịch của quỹ
router.get('/funds/:id/transactions',          authMiddleware, getTransactions);
router.post('/funds/:id/transactions',         authMiddleware, addTransaction);
router.put('/funds/:id/transactions/:txId',    authMiddleware, updateTransaction);
router.delete('/funds/:id/transactions/:txId', authMiddleware, deleteTransaction);

// Migration: bật shrine cho tất cả thành viên đã mất
router.post('/migrate-shrine', authMiddleware, migrateShrine);

// Cài đặt hiển thị thông tin
router.get('/visibility', authMiddleware, getVisibilitySettings);
router.put('/visibility', authMiddleware, updateVisibilitySettings);

module.exports = router;
