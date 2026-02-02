const Suggestion = require('../models/Suggestion');
const Member = require('../models/Member');

// Tạo đề xuất mới (không cần đăng nhập)
const createSuggestion = async (req, res) => {
    try {
        const { type, viewCode, newMemberData, editMemberData, reportData, submitter } = req.body;

        if (!viewCode || !type || !submitter?.name) {
            return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
        }

        // Tìm chủ cây từ viewCode
        const member = await Member.findOne({ viewCode });
        if (!member) {
            return res.status(404).json({ message: 'Không tìm thấy cây gia phả' });
        }

        const suggestion = await Suggestion.create({
            type,
            viewCode,
            treeOwner: member.createdBy,
            newMemberData,
            editMemberData,
            reportData,
            submitter,
        });

        res.status(201).json({ message: 'Đã gửi đề xuất thành công', suggestion });
    } catch (error) {
        console.error('Lỗi tạo đề xuất:', error);
        res.status(500).json({ message: 'Lỗi khi gửi đề xuất', error });
    }
};

// Lấy danh sách đề xuất của chủ cây (cần đăng nhập)
const getSuggestions = async (req, res) => {
    try {
        const { status } = req.query;
        const query = { treeOwner: req.user._id };

        if (status && status !== 'all') {
            query.status = status;
        }

        const suggestions = await Suggestion.find(query)
            .sort({ createdAt: -1 })
            .populate('newMemberData.parentId', 'name')
            .populate('editMemberData.memberId', 'name')
            .populate('reportData.memberId', 'name');

        res.json(suggestions);
    } catch (error) {
        console.error('Lỗi lấy đề xuất:', error);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách đề xuất', error });
    }
};

// Đếm số đề xuất pending
const countPendingSuggestions = async (req, res) => {
    try {
        const count = await Suggestion.countDocuments({
            treeOwner: req.user._id,
            status: 'pending',
        });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi đếm đề xuất', error });
    }
};

// Duyệt đề xuất
const approveSuggestion = async (req, res) => {
    try {
        const { id } = req.params;

        const suggestion = await Suggestion.findOne({
            _id: id,
            treeOwner: req.user._id,
        });

        if (!suggestion) {
            return res.status(404).json({ message: 'Không tìm thấy đề xuất' });
        }

        if (suggestion.status !== 'pending') {
            return res.status(400).json({ message: 'Đề xuất đã được xử lý' });
        }

        // Nếu là thêm người mới, tự động tạo member
        if (suggestion.type === 'add' && suggestion.newMemberData) {
            const { name, gender, birthday, phoneNumber, address, parentId, spouseIndex, isAlive, deathDate } =
                suggestion.newMemberData;

            const newMember = await Member.create({
                name,
                gender: gender || 'male',
                birthday,
                phoneNumber,
                address,
                parent: parentId || null,
                spouseIndex: spouseIndex || 0,
                isAlive: isAlive !== false,
                deathDate,
                maritalStatus: 'single',
                createdBy: req.user._id,
                viewCode: suggestion.viewCode,
            });

            // Nếu có parent, thêm vào children của parent
            if (parentId) {
                await Member.findByIdAndUpdate(parentId, {
                    $push: { children: newMember._id },
                });
            }
        }

        // Nếu là sửa thông tin, tự động cập nhật
        if (suggestion.type === 'edit' && suggestion.editMemberData) {
            const { memberId, field, newValue } = suggestion.editMemberData;

            if (memberId && field) {
                const updateData = {};

                // Xử lý các field đặc biệt
                if (field === 'birthday' || field === 'deathDate') {
                    updateData[field] = newValue ? new Date(newValue) : null;
                } else if (field === 'isAlive') {
                    updateData[field] = newValue === 'true' || newValue === true;
                } else {
                    updateData[field] = newValue;
                }

                await Member.findByIdAndUpdate(memberId, updateData);
            }
        }

        suggestion.status = 'approved';
        await suggestion.save();

        res.json({ message: 'Đã duyệt đề xuất', suggestion });
    } catch (error) {
        console.error('Lỗi duyệt đề xuất:', error);
        res.status(500).json({ message: 'Lỗi khi duyệt đề xuất', error });
    }
};

// Từ chối đề xuất
const rejectSuggestion = async (req, res) => {
    try {
        const { id } = req.params;

        const suggestion = await Suggestion.findOne({
            _id: id,
            treeOwner: req.user._id,
        });

        if (!suggestion) {
            return res.status(404).json({ message: 'Không tìm thấy đề xuất' });
        }

        if (suggestion.status !== 'pending') {
            return res.status(400).json({ message: 'Đề xuất đã được xử lý' });
        }

        suggestion.status = 'rejected';
        await suggestion.save();

        res.json({ message: 'Đã từ chối đề xuất', suggestion });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi từ chối đề xuất', error });
    }
};

// Xóa đề xuất
const deleteSuggestion = async (req, res) => {
    try {
        const { id } = req.params;

        const suggestion = await Suggestion.findOneAndDelete({
            _id: id,
            treeOwner: req.user._id,
        });

        if (!suggestion) {
            return res.status(404).json({ message: 'Không tìm thấy đề xuất' });
        }

        res.json({ message: 'Đã xóa đề xuất' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi xóa đề xuất', error });
    }
};

module.exports = {
    createSuggestion,
    getSuggestions,
    countPendingSuggestions,
    approveSuggestion,
    rejectSuggestion,
    deleteSuggestion,
};