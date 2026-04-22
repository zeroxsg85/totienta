const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * CrossTreeMatch – Phát hiện trùng member giữa 2 cây gia phả khác nhau
 * Status flow: pending → confirmed (cả 2 đồng ý) | denied (1 trong 2 từ chối)
 */
const crossTreeMatchSchema = new Schema({
  // ── Bên A (người phát hiện / member bị so sánh) ─────────────────────────────
  treeOwnerA: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  memberA:    { type: Schema.Types.ObjectId, ref: 'Member', required: true },
  viewCodeA:  { type: String },
  memberAName: { type: String },

  // ── Bên B (cây kia) ──────────────────────────────────────────────────────────
  treeOwnerB: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  memberB:    { type: Schema.Types.ObjectId, ref: 'Member', required: true },
  viewCodeB:  { type: String },
  memberBName: { type: String },

  // ── Thông tin match ──────────────────────────────────────────────────────────
  matchFields: [{ type: String }], // 'idCard' | 'phone' | 'name+birthday' | 'name'
  matchScore:  { type: Number, default: 0 }, // 0-100

  // ── Xác nhận từ 2 phía ──────────────────────────────────────────────────────
  confirmedByA: { type: Boolean, default: false },
  confirmedByB: { type: Boolean, default: false },
  deniedByA:    { type: Boolean, default: false },
  deniedByB:    { type: Boolean, default: false },

  // ── Trạng thái tổng ─────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'denied'],
    default: 'pending',
  },

  // ── Gợi ý tự động từ match đã xác nhận ──────────────────────────────────────
  autoSuggestedFrom: { type: Schema.Types.ObjectId, ref: 'CrossTreeMatch' },

  // ── Liên kết đến CrossTreeLink khi cả 2 confirm ─────────────────────────────
  crossTreeLinkId: { type: Schema.Types.ObjectId, ref: 'CrossTreeLink' },

  createdAt: { type: Date, default: Date.now },
});

// Index để tránh tạo duplicate match
crossTreeMatchSchema.index({ memberA: 1, memberB: 1 }, { unique: true });

module.exports = mongoose.model('CrossTreeMatch', crossTreeMatchSchema);
