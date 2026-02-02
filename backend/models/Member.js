const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        gender: { type: String, enum: ['male', 'female'], required: true },
        birthday: { type: Date },
        maritalStatus: { type: String, enum: ['single', 'married', 'divorced', 'widowed'], required: true },
        isAlive: { type: Boolean, required: true },
        avatar: { type: String },
        phoneNumber: { type: String },
        address: { type: String },
        spouse: [
            {
                name: { type: String, required: true },
                phoneNumber: { type: String },
                birthday: { type: Date },
                hometown: { type: String },
            }
        ],
        deathDate: { type: Date },
        parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
        children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
        spouseIndex: { type: Number, default: 0 }, // 👈 Con của vợ/chồng thứ mấy (0 = đầu tiên)
        order: { type: Number, default: 0 },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        viewCode: { type: String, sparse: true },
        customFields: [
            {
                label: { type: String, required: true },
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
