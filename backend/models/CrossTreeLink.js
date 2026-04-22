const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * CrossTreeLink – Kết nối chính thức giữa 2 cây gia phả sau khi cả 2 admin xác nhận
 * Lưu các cặp member trùng (linkedPairs) và dùng để hiển thị "cây mở rộng"
 */
const crossTreeLinkSchema = new Schema({
  treeOwnerA: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  treeOwnerB: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  viewCodeA:  { type: String },
  viewCodeB:  { type: String },

  // Các cặp member đã được xác nhận trùng
  linkedPairs: [{
    memberA: { type: Schema.Types.ObjectId, ref: 'Member' },
    memberB: { type: Schema.Types.ObjectId, ref: 'Member' },
  }],

  status: {
    type: String,
    enum: ['active', 'dissolved'],
    default: 'active',
  },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('CrossTreeLink', crossTreeLinkSchema);
