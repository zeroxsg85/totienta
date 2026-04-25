const mongoose = require('mongoose');

const lunarDateSchema = new mongoose.Schema(
    {
        day: { type: Number },
        month: { type: Number },
        year: { type: Number },
        isLeap: { type: Boolean, default: false },
    },
    { _id: false }
);

const memberSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        gender: { type: String, enum: ['male', 'female'], required: true },
        birthday: {
            solar: { type: Date },
            lunar: { type: lunarDateSchema },
        },
        maritalStatus: { type: String, enum: ['single', 'married', 'divorced', 'widowed'], required: true },
        isAlive: { type: Boolean, required: true },
        avatar: { type: String },
        phoneNumber: { type: String },
        address: { type: String },
        occupation: { type: String },
        hometown: { type: String },
        religion: { type: String },
        spouse: [
            {
                name: { type: String, required: true },
                phoneNumber: { type: String },
                birthday: { type: Date },
                hometown: { type: String },
            }
        ],
        deathDate: {
            solar: { type: Date },
            lunar: { type: lunarDateSchema },
        },
        // Ngày giỗ có thể khác ngày mất (rút lên 1 ngày, v.v.)
        anniversaryDate: {
            lunar: {
                type: new mongoose.Schema(
                    {
                        day: { type: Number },
                        month: { type: Number },
                    },
                    { _id: false }
                ),
            },
            note: { type: String },
        },
        memorial: {
            biography: { type: String },
            epitaph: { type: String },
            photos: [{ type: String }],
            videos: [{ type: String }],
            audioUrl: { type: String },
            achievements: [{ type: String }],
            story: { type: String },
        },
        burial: {
            location: { type: String },
            coordinates: {
                lat: { type: Number },
                lng: { type: Number },
            },
            photo: { type: String },
            lastVisited: { type: Date },
        },
        // Giấy tờ tùy thân (CCCD / CMND / Passport) – dùng để xác định danh tính
        idCard: {
            number: { type: String },
            type:   { type: String, enum: ['cccd', 'cmnd', 'passport', 'other'], default: 'cccd' },
        },

        shrine: {
            isEnabled: { type: Boolean, default: false },
            backgroundTheme: { type: String },
            incenseCount: { type: Number, default: 0 },
            lastIncense: { type: Date },
            offerings: [{ type: String }], // danh sách nổi bật do chủ cây chọn
            offeringStats: [{              // thống kê lễ vật được dâng
                label: { type: String },
                count: { type: Number, default: 0 },
                lastOffered: { type: Date },
            }],
        },
        legacy: {
            messages: [
                {
                    content: { type: String },
                    scheduledAt: { type: Date },
                    toWhom: { type: String },
                }
            ],
            voiceCloneUrl: { type: String },
            lastWords: { type: String },
        },
        parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
        children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
        spouseIndex: { type: Number, default: 0 },
        order: { type: Number, default: 0 },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        viewCode: { type: String, sparse: true },
        customFields: [
            {
                label: { type: String, default: '' },
                type: {
                    type: String,
                    enum: ['text', 'number', 'date', 'image', 'boolean'],
                    required: true
                },
                value: { type: mongoose.Schema.Types.Mixed },
            }
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model('Member', memberSchema);
