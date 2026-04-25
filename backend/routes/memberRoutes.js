const express = require('express');
const multer = require("multer");
const { getAllMembers, getMember, createMember, updateMember, deleteMember, getFamilyTree, getAllMembersFlat, generateViewCode, updateViewCode, getFamilyTreeByViewCode, getViewCode, uploadMemberAvatar, uploadAlbumPhoto, deleteAlbumPhoto, getTreeInfo, searchGlobal, getUpcomingEvents } = require('../controllers/memberController');
const { burnIncense, offerItem, getMemberShrinePublic, getShrineLog, resetShrine } = require('../controllers/clanController');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ── Authenticated routes ───────────────────────────────────────────────────────
router.get('/', authMiddleware, getAllMembers);
router.post('/', authMiddleware, createMember);
// Named GET routes must come BEFORE /:id to avoid shadowing
router.get('/family-tree', authMiddleware, getFamilyTree);
router.get('/all', authMiddleware, getAllMembersFlat);
router.get('/view-code', authMiddleware, getViewCode);
router.get('/search-global', authMiddleware, searchGlobal);
router.get('/upcoming-events', authMiddleware, getUpcomingEvents);
router.post('/generate-view-code', authMiddleware, generateViewCode);
router.post('/update-view-code', authMiddleware, updateViewCode);
router.post('/upload-avatar', authMiddleware, upload.single('avatar'), uploadMemberAvatar);
// Dynamic :id routes
router.get('/:id', authMiddleware, getMember);
router.put('/:id', authMiddleware, updateMember);
router.delete('/:id', authMiddleware, deleteMember);
router.post('/:id/album/upload', authMiddleware, upload.single('photo'), uploadAlbumPhoto);
router.delete('/:id/album/:fieldIdx', authMiddleware, deleteAlbumPhoto);

// ── Public routes ─────────────────────────────────────────────────────────────
router.get('/view/:viewCode', getFamilyTreeByViewCode);
router.get('/tree-info/:viewCode', getTreeInfo);

// Bàn thờ số – public (không cần đăng nhập)
router.get('/:id/shrine-public', getMemberShrinePublic);         // dữ liệu bàn thờ
router.get('/:id/shrine/logs', getShrineLog);                    // lịch sử hoạt động
router.post('/:id/shrine/incense', burnIncense);                 // thắp nhang
router.post('/:id/shrine/offering', offerItem);                  // dâng lễ vật

// Bàn thờ số – cần đăng nhập (admin)
router.delete('/:id/shrine/reset', authMiddleware, resetShrine); // reset nhang/lễ vật

module.exports = router;
