const mongoose = require('mongoose');

const suggestionSchema = new mongoose.Schema(
    {
        // Loại đề xuất
        type: {
            type: String,
            enum: ['add', 'edit', 'report'], // add: thêm người, edit: sửa thông tin, report: báo sai
            required: true,
        },

        // Trạng thái
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },

        // Chủ cây (người nhận đề xuất)
        treeOwner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        // ViewCode của cây
        viewCode: {
            type: String,
            required: true,
        },

        // === Cho loại "add" - Thêm người mới ===
        newMemberData: {
            name: String,
            gender: { type: String, enum: ['male', 'female'] },
            birthday: Date,
            phoneNumber: String,
            address: String,
            parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
            parentName: String, // Lưu tên để hiển thị
            spouseIndex: Number,
            isAlive: { type: Boolean, default: true },
            deathDate: Date,
            note: String,
        },

        // === Cho loại "edit" - Sửa thông tin ===
        editMemberData: {
            memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
            memberName: String, // Lưu tên để hiển thị
            field: String, // Trường cần sửa: name, birthday, phoneNumber, address, deathDate...
            oldValue: String,
            newValue: String,
            note: String,
        },

        // === Cho loại "report" - Báo sai ===
        reportData: {
            memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
            memberName: String,
            description: String, // Mô tả lỗi sai
        },

        // Người gửi đề xuất (không cần đăng ký)
        submitter: {
            name: String,
            phone: String,
            email: String,
            relationship: String, // Quan hệ với gia đình: con cháu, họ hàng, bạn bè...
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Suggestion', suggestionSchema);