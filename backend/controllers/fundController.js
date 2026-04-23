const ClanFund        = require('../models/ClanFund');
const FundTransaction = require('../models/FundTransaction');
const Member          = require('../models/Member');

// ══════════════════════════════════════════════════════
//  QUẢN LÝ QUỸ
// ══════════════════════════════════════════════════════

// GET /clan/funds
const getFunds = async (req, res) => {
    try {
        const funds = await ClanFund.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
        res.json(funds);
    } catch (e) {
        res.status(500).json({ message: 'Lỗi khi lấy danh sách quỹ', error: e });
    }
};

// POST /clan/funds
const createFund = async (req, res) => {
    try {
        const { name, targetAmount, currency, purpose } = req.body;
        if (!name?.trim()) return res.status(400).json({ message: 'Tên quỹ không được để trống' });

        const fund = await ClanFund.create({
            createdBy: req.user._id,
            name: name.trim(),
            targetAmount: targetAmount || 0,
            currency: currency || 'VND',
            purpose: purpose || '',
        });
        res.status(201).json(fund);
    } catch (e) {
        res.status(500).json({ message: 'Lỗi khi tạo quỹ', error: e });
    }
};

// PUT /clan/funds/:id
const updateFund = async (req, res) => {
    try {
        const fund = await ClanFund.findOne({ _id: req.params.id, createdBy: req.user._id });
        if (!fund) return res.status(404).json({ message: 'Không tìm thấy quỹ' });

        const { name, targetAmount, currency, purpose, isEnabled } = req.body;
        if (name !== undefined)         fund.name         = name.trim();
        if (targetAmount !== undefined) fund.targetAmount  = Number(targetAmount);
        if (currency !== undefined)     fund.currency      = currency;
        if (purpose !== undefined)      fund.purpose       = purpose;
        if (isEnabled !== undefined)    fund.isEnabled     = isEnabled;

        await fund.save();
        res.json(fund);
    } catch (e) {
        res.status(500).json({ message: 'Lỗi khi cập nhật quỹ', error: e });
    }
};

// DELETE /clan/funds/:id
const deleteFund = async (req, res) => {
    try {
        const fund = await ClanFund.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
        if (!fund) return res.status(404).json({ message: 'Không tìm thấy quỹ' });

        await FundTransaction.deleteMany({ fund: fund._id });
        res.json({ message: 'Đã xóa quỹ' });
    } catch (e) {
        res.status(500).json({ message: 'Lỗi khi xóa quỹ', error: e });
    }
};

// ══════════════════════════════════════════════════════
//  GIAO DỊCH
// ══════════════════════════════════════════════════════

// GET /clan/funds/:id/transactions?type=income|expense
const getTransactions = async (req, res) => {
    try {
        // Kiểm tra quỹ thuộc về user
        const fund = await ClanFund.findOne({ _id: req.params.id, createdBy: req.user._id });
        if (!fund) return res.status(404).json({ message: 'Không tìm thấy quỹ' });

        const filter = { fund: fund._id };
        if (req.query.type) filter.type = req.query.type;

        const transactions = await FundTransaction
            .find(filter)
            .populate('member', 'name avatar')
            .sort({ date: -1 });

        res.json(transactions);
    } catch (e) {
        res.status(500).json({ message: 'Lỗi khi lấy giao dịch', error: e });
    }
};

// POST /clan/funds/:id/transactions
const addTransaction = async (req, res) => {
    try {
        const fund = await ClanFund.findOne({ _id: req.params.id, createdBy: req.user._id });
        if (!fund) return res.status(404).json({ message: 'Không tìm thấy quỹ' });

        const { type, amount, date, transactionCode, member, memberName, recipient, note } = req.body;

        if (!type || !['income', 'expense'].includes(type))
            return res.status(400).json({ message: 'Loại giao dịch không hợp lệ' });
        if (!amount || amount <= 0)
            return res.status(400).json({ message: 'Số tiền phải lớn hơn 0' });
        if (!date)
            return res.status(400).json({ message: 'Vui lòng chọn ngày' });

        const tx = await FundTransaction.create({
            fund: fund._id,
            createdBy: req.user._id,
            type,
            amount: Number(amount),
            date: new Date(date),
            transactionCode: transactionCode || '',
            member: member || null,
            memberName: memberName || '',
            recipient: recipient || '',
            note: note || '',
        });

        await tx.populate('member', 'name avatar');
        res.status(201).json(tx);
    } catch (e) {
        res.status(500).json({ message: 'Lỗi khi thêm giao dịch', error: e });
    }
};

// PUT /clan/funds/:id/transactions/:txId
const updateTransaction = async (req, res) => {
    try {
        const fund = await ClanFund.findOne({ _id: req.params.id, createdBy: req.user._id });
        if (!fund) return res.status(404).json({ message: 'Không tìm thấy quỹ' });

        const tx = await FundTransaction.findOneAndUpdate(
            { _id: req.params.txId, fund: fund._id },
            {
                ...req.body,
                amount: req.body.amount ? Number(req.body.amount) : undefined,
                date:   req.body.date   ? new Date(req.body.date)  : undefined,
            },
            { new: true, runValidators: true }
        ).populate('member', 'name avatar');

        if (!tx) return res.status(404).json({ message: 'Không tìm thấy giao dịch' });
        res.json(tx);
    } catch (e) {
        res.status(500).json({ message: 'Lỗi khi cập nhật giao dịch', error: e });
    }
};

// DELETE /clan/funds/:id/transactions/:txId
const deleteTransaction = async (req, res) => {
    try {
        const fund = await ClanFund.findOne({ _id: req.params.id, createdBy: req.user._id });
        if (!fund) return res.status(404).json({ message: 'Không tìm thấy quỹ' });

        const tx = await FundTransaction.findOneAndDelete({ _id: req.params.txId, fund: fund._id });
        if (!tx) return res.status(404).json({ message: 'Không tìm thấy giao dịch' });
        res.json({ message: 'Đã xóa giao dịch' });
    } catch (e) {
        res.status(500).json({ message: 'Lỗi khi xóa giao dịch', error: e });
    }
};

module.exports = {
    getFunds, createFund, updateFund, deleteFund,
    getTransactions, addTransaction, updateTransaction, deleteTransaction,
};
