const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        gender: { type: String, enum: ['male', 'female'], required: true },
        birthday: { type: Date },
        maritalStatus: { type: String, enum: ['single', 'married', 'divorced', 'widowed'], required: true },
        isAlive: { type: Boolean, required: true },
        avatar: { type: String },
        phoneNumber: { type: String }, // 📞 Số điện thoại
        address: { type: String }, // 🏠 Nơi ở
        spouse: [
            {
                name: { type: String, required: true }, // 👩‍❤️‍👨 Tên chồng/vợ
                phoneNumber: { type: String }, // 📞 Số điện thoại chồng/vợ
                birthday: { type: Date }, // 🎂 Sinh nhật chồng/vợ
                hometown: { type: String },
            }
        ],
        deathDate: { type: Date }, // ⚰️ Ngày mất (nếu đã mất)
        parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
        children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
        order: { type: Number, default: 0 }, // 🔢 Thứ tự trong gia đình
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        viewCode: { type: String, sparse: true },

        // 🆕 Trường tùy chỉnh (dynamic fields)
        customFields: [
            {
                label: { type: String, required: true }, // 🏷️ Tên trường
                type: {
                    type: String,
                    enum: ['text', 'number', 'date', 'image', 'boolean'], // 📋 Các loại dữ liệu hỗ trợ
                    required: true
                },
                value: { type: mongoose.Schema.Types.Mixed }, // 📌 Giá trị lưu trữ (có thể là số, chữ, ngày tháng...)
            }
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model('Member', memberSchema);
