const mongoose = require('mongoose');

const clanFundSchema = new mongoose.Schema({
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name:         { type: String, required: true },          // "Quỹ Khuyến Học"
    targetAmount: { type: Number, default: 0 },              // Mục tiêu
    currency:     { type: String, default: 'VND' },
    purpose:      { type: String, default: '' },             // Mô tả mục đích
    isEnabled:    { type: Boolean, default: true },
    // balance được tính từ transactions, lưu cache để truy vấn nhanh
    incomeTotal:  { type: Number, default: 0 },
    expenseTotal: { type: Number, default: 0 },
}, { timestamps: true });

// Virtual: số dư thực
clanFundSchema.virtual('balance').get(function () {
    return this.incomeTotal - this.expenseTotal;
});

clanFundSchema.set('toJSON',   { virtuals: true });
clanFundSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ClanFund', clanFundSchema);
