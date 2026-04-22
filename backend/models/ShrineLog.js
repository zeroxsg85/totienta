const mongoose = require('mongoose');

const shrineLogSchema = new mongoose.Schema(
    {
        memberId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
        viewCode:     { type: String },
        action:       { type: String, enum: ['incense', 'offering'], required: true },
        offeringLabel:{ type: String },                              // chỉ có khi action='offering'
        userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        displayName:  { type: String, default: 'Ẩn danh' },        // tên hiển thị
    },
    { timestamps: true }
);

// Index để query nhanh theo memberId + thời gian
shrineLogSchema.index({ memberId: 1, createdAt: -1 });

module.exports = mongoose.model('ShrineLog', shrineLogSchema);
