const express = require('express');
const multer = require("multer");
const { getAllMembers, createMember, updateMember, deleteMember, getFamilyTree, getAllMembersFlat, generateViewCode, updateViewCode, getFamilyTreeByViewCode, getViewCode, uploadMemberAvatar, getTreeInfo } = require('../controllers/memberController');
const authMiddleware = require('../middlewares/authMiddleware'); // Import middleware
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // Sử dụng bộ nhớ tạm

// API Routes
router.get('/', authMiddleware, getAllMembers); // Lấy danh sách tất cả thành viên
router.post('/', authMiddleware, createMember); // Thêm thành viên mới
router.put('/:id', authMiddleware, updateMember); // Cập nhật thông tin thành viên
router.delete('/:id', authMiddleware, deleteMember); // Xóa thành viên
router.get('/family-tree', authMiddleware, getFamilyTree);
router.get('/all', authMiddleware, getAllMembersFlat);
router.post('/generate-view-code', authMiddleware, generateViewCode); // 🔐 Chỉ người quản lý mới tạo mã
router.get('/view-code', authMiddleware, getViewCode);
router.get('/view/:viewCode', getFamilyTreeByViewCode);
router.post('/update-view-code', authMiddleware, updateViewCode);
router.post('/upload-avatar', authMiddleware, upload.single('avatar'), uploadMemberAvatar);
router.get('/tree-info/:viewCode', getTreeInfo);

module.exports = router;
