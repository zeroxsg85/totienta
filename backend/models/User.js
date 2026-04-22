const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },

    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    birthday: { type: Date, default: null },
    avatar: { type: String, default: '' },
    // Cho tính năng tính phí sau này
    plan: { type: String, enum: ['free', 'basic', 'premium'], default: 'free' },
    planExpiry: { type: Date, default: null },
    treeName: { type: String, default: '' },

    // Xác thực 2 bước (TOTP)
    twoFactor: {
        enabled: { type: Boolean, default: false },
        secret:  { type: String, default: null }, // TOTP secret, chỉ lưu khi enabled
    },

    // Quỹ dòng họ
    fund: {
        isEnabled: { type: Boolean, default: false },
        balance: { type: Number, default: 0 },
        currency: { type: String, default: 'VND' },
        purpose: { type: String },
        // transactions ref sang collection riêng khi cần
    },

    // Sự kiện dòng họ
    events: [
        {
            title: { type: String, required: true },
            date: { type: Date },
            lunarDate: {
                day: { type: Number },
                month: { type: Number },
                year: { type: Number },
                isLeap: { type: Boolean, default: false },
            },
            type: {
                type: String,
                enum: ['giỗ tổ', 'họp họ', 'tảo mộ', 'khác'],
                default: 'khác',
            },
            location: { type: String },
            livestreamUrl: { type: String },
        }
    ],

    // Thông tin dòng họ
    clanInfo: {
        origin: { type: String },
        ancestralHome: { type: String },
        motto: { type: String },
        crest: { type: String },
    },

    // Cài đặt hiển thị thông tin (public / login / member)
    visibilitySettings: {
        phoneNumber: { type: String, enum: ['public', 'login', 'member'], default: 'member' },
        birthday:    { type: String, enum: ['public', 'login', 'member'], default: 'member' },
        address:     { type: String, enum: ['public', 'login', 'member'], default: 'member' },
        idCard:      { type: String, enum: ['public', 'login', 'member'], default: 'member' },
        occupation:  { type: String, enum: ['public', 'login', 'member'], default: 'public' },
        hometown:    { type: String, enum: ['public', 'login', 'member'], default: 'public' },
        religion:    { type: String, enum: ['public', 'login', 'member'], default: 'public' },
        spouse:      { type: String, enum: ['public', 'login', 'member'], default: 'member' },
        memorial:    { type: String, enum: ['public', 'login', 'member'], default: 'public' },
        burial:      { type: String, enum: ['public', 'login', 'member'], default: 'member' },
        legacy:      { type: String, enum: ['public', 'login', 'member'], default: 'member' },
        shrine:      { type: String, enum: ['public', 'login', 'member'], default: 'public' },
    },

}, { timestamps: true });

// Mã hóa mật khẩu trước khi lưu
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// So sánh mật khẩu khi đăng nhập
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
