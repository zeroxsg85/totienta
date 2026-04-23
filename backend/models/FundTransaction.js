const mongoose = require('mongoose');

const fundTransactionSchema = new mongoose.Schema({
    fund:            { type: mongoose.Schema.Types.ObjectId, ref: 'ClanFund', required: true, index: true },
    createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type:            { type: String, enum: ['income', 'expense'], required: true },
    amount:          { type: Number, required: true, min: 0 },
    date:            { type: Date, required: true },
    transactionCode: { type: String, default: '' },  // Mã GD ngân hàng hoặc tự đặt

    // ── Đối với THU ──────────────────────────────────────────────
    member:     { type: mongoose.Schema.Types.ObjectId, ref: 'Member', default: null }, // thành viên trong cây
    memberName: { type: String, default: '' },   // tên ghi nhận (override hoặc không phải thành viên)

    // ── Đối với CHI ──────────────────────────────────────────────
    recipient: { type: String, default: '' },    // Người/việc thụ hưởng

    note: { type: String, default: '' },
}, { timestamps: true });

// Sau khi lưu: cập nhật cache incomeTotal/expenseTotal trên ClanFund
async function recalcFundTotals(fundId) {
    const ClanFund = mongoose.model('ClanFund');
    const agg = await mongoose.model('FundTransaction').aggregate([
        { $match: { fund: fundId } },
        { $group: {
            _id: '$type',
            total: { $sum: '$amount' },
        }},
    ]);

    let incomeTotal = 0, expenseTotal = 0;
    for (const row of agg) {
        if (row._id === 'income')  incomeTotal  = row.total;
        if (row._id === 'expense') expenseTotal = row.total;
    }
    await ClanFund.findByIdAndUpdate(fundId, { incomeTotal, expenseTotal });
}

fundTransactionSchema.post('save',             async function () { await recalcFundTotals(this.fund); });
fundTransactionSchema.post('findOneAndUpdate',  async function (doc) { if (doc) await recalcFundTotals(doc.fund); });
fundTransactionSchema.post('findOneAndDelete',  async function (doc) { if (doc) await recalcFundTotals(doc.fund); });

module.exports = mongoose.model('FundTransaction', fundTransactionSchema);
