const User = require('../models/User');

// ── helper: resolve user from optional Bearer token ────────────────────────────
async function resolveActor(req) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) return { userId: null, displayName: 'Ẩn danh' };
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
        const uid = decoded.id || decoded._id;
        const user = await User.findById(uid).select('name');
        return { userId: uid, displayName: user?.name || 'Ẩn danh' };
    } catch {
        return { userId: null, displayName: 'Ẩn danh' };
    }
}

// ── Dòng họ ───────────────────────────────────────────────────────────────────
const getClanData = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('treeName clanInfo events fund');
        if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy thông tin dòng họ', error });
    }
};

const updateClanInfo = async (req, res) => {
    try {
        const { origin, ancestralHome, motto, crest } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { clanInfo: { origin, ancestralHome, motto, crest } } },
            { new: true }
        ).select('clanInfo');
        res.json(user.clanInfo);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi cập nhật thông tin dòng họ', error });
    }
};

const getEvents = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('events');
        res.json(user?.events || []);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy sự kiện', error });
    }
};

const addEvent = async (req, res) => {
    try {
        const { title, date, lunarDate, type, location, livestreamUrl } = req.body;
        if (!title) return res.status(400).json({ message: 'Tên sự kiện là bắt buộc' });
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $push: { events: { title, date, lunarDate, type: type || 'khác', location, livestreamUrl } } },
            { new: true }
        ).select('events');
        res.status(201).json(user.events[user.events.length - 1]);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi thêm sự kiện', error });
    }
};

const updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, date, lunarDate, type, location, livestreamUrl } = req.body;
        const user = await User.findOneAndUpdate(
            { _id: req.user._id, 'events._id': id },
            {
                $set: {
                    'events.$.title': title,
                    'events.$.date': date,
                    'events.$.lunarDate': lunarDate,
                    'events.$.type': type || 'khác',
                    'events.$.location': location,
                    'events.$.livestreamUrl': livestreamUrl,
                }
            },
            { new: true }
        ).select('events');
        if (!user) return res.status(404).json({ message: 'Không tìm thấy sự kiện' });
        res.json(user.events.id(id));
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi cập nhật sự kiện', error });
    }
};

const deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;
        await User.findByIdAndUpdate(req.user._id, { $pull: { events: { _id: id } } });
        res.json({ message: 'Đã xóa sự kiện' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi xóa sự kiện', error });
    }
};

const updateFund = async (req, res) => {
    try {
        const { isEnabled, balance, currency, purpose } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { fund: { isEnabled, balance, currency: currency || 'VND', purpose } } },
            { new: true }
        ).select('fund');
        res.json(user.fund);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi cập nhật quỹ', error });
    }
};

// ── Bàn thờ số – public routes ────────────────────────────────────────────────

/** Lấy dữ liệu bàn thờ công khai của một thành viên
 *  Luôn trả về member (kể cả khi shrine tắt) để FE hiển thị thông báo đẹp */
const getMemberShrinePublic = async (req, res) => {
    try {
        const Member = require('../models/Member');
        const member = await Member.findById(req.params.id)
            .select('name avatar gender shrine memorial deathDate viewCode');
        if (!member) return res.status(404).json({ message: 'Không tìm thấy thành viên' });
        // Không 404 khi shrine tắt – FE tự xử lý hiển thị thông báo
        res.json(member);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy dữ liệu bàn thờ', error });
    }
};

/** Lấy log hoạt động bàn thờ (20 gần nhất) */
const getShrineLog = async (req, res) => {
    try {
        const ShrineLog = require('../models/ShrineLog');
        const logs = await ShrineLog.find({ memberId: req.params.id })
            .sort({ createdAt: -1 })
            .limit(20)
            .select('action offeringLabel displayName createdAt');
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy log', error });
    }
};

/** Thắp nhang */
const burnIncense = async (req, res) => {
    try {
        const Member = require('../models/Member');
        const ShrineLog = require('../models/ShrineLog');
        const { id } = req.params;

        const member = await Member.findById(id);
        if (!member) return res.status(404).json({ message: 'Không tìm thấy thành viên' });
        if (!member.shrine?.isEnabled) return res.status(400).json({ message: 'Bàn thờ số chưa được bật' });

        const now = new Date();
        member.shrine.incenseCount = (member.shrine.incenseCount || 0) + 1;
        member.shrine.lastIncense = now;
        await member.save();

        // Log hành động (optional auth)
        const actor = await resolveActor(req);
        await ShrineLog.create({
            memberId: id,
            viewCode: member.viewCode,
            action: 'incense',
            userId: actor.userId,
            displayName: actor.displayName,
        });

        res.json({ incenseCount: member.shrine.incenseCount, lastIncense: now });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi thắp nhang', error });
    }
};

/** Dâng lễ vật */
const offerItem = async (req, res) => {
    try {
        const Member = require('../models/Member');
        const ShrineLog = require('../models/ShrineLog');
        const { id } = req.params;
        const { label } = req.body;

        if (!label) return res.status(400).json({ message: 'Thiếu tên lễ vật' });

        const member = await Member.findById(id);
        if (!member) return res.status(404).json({ message: 'Không tìm thấy thành viên' });
        if (!member.shrine?.isEnabled) return res.status(400).json({ message: 'Bàn thờ số chưa được bật' });

        if (!member.shrine.offeringStats) member.shrine.offeringStats = [];

        const now = new Date();
        const existing = member.shrine.offeringStats.find(s => s.label === label);
        if (existing) {
            existing.count = (existing.count || 0) + 1;
            existing.lastOffered = now;
        } else {
            member.shrine.offeringStats.push({ label, count: 1, lastOffered: now });
        }
        member.markModified('shrine.offeringStats');
        await member.save();

        // Log hành động (optional auth)
        const actor = await resolveActor(req);
        await ShrineLog.create({
            memberId: id,
            viewCode: member.viewCode,
            action: 'offering',
            offeringLabel: label,
            userId: actor.userId,
            displayName: actor.displayName,
        });

        const stat = member.shrine.offeringStats.find(s => s.label === label);
        res.json({ label, count: stat.count, lastOffered: now });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi dâng lễ vật', error });
    }
};

// ── Reset bàn thờ ─────────────────────────────────────────────────────────────

/** Reset nhang và/hoặc lễ vật về 0 */
const resetShrine = async (req, res) => {
    try {
        const Member = require('../models/Member');
        const { id } = req.params;
        const { type } = req.query; // 'incense' | 'offerings' | undefined (= cả hai)

        const member = await Member.findOne({ _id: id, createdBy: req.user._id });
        if (!member) return res.status(404).json({ message: 'Không tìm thấy thành viên hoặc không có quyền' });

        if (!type || type === 'incense') {
            member.shrine.incenseCount = 0;
            member.shrine.lastIncense = undefined;
        }
        if (!type || type === 'offerings') {
            member.shrine.offeringStats = [];
        }

        member.markModified('shrine');
        await member.save();
        res.json({ message: 'Đã reset thành công', shrine: member.shrine });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi reset bàn thờ', error });
    }
};

// ── Visibility settings ────────────────────────────────────────────────────────

/** Migration: tự động bật shrine cho tất cả thành viên đã mất trong cây của admin */
const migrateShrine = async (req, res) => {
    try {
        const Member = require('../models/Member');
        const result = await Member.updateMany(
            {
                createdBy: req.user._id,
                isAlive: false,
                'shrine.isEnabled': { $ne: true },  // chỉ fix những cái chưa bật
            },
            { $set: { 'shrine.isEnabled': true } }
        );
        res.json({
            message: `Đã bật bàn thờ số cho ${result.modifiedCount} thành viên đã mất`,
            modifiedCount: result.modifiedCount,
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi migration shrine', error });
    }
};

const getVisibilitySettings = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('visibilitySettings');
        res.json({ visibilitySettings: user?.visibilitySettings || {} });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy cài đặt hiển thị', error });
    }
};

const updateVisibilitySettings = async (req, res) => {
    try {
        const { visibilitySettings } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { visibilitySettings } },
            { new: true }
        ).select('visibilitySettings');
        res.json({ visibilitySettings: user.visibilitySettings });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi cập nhật cài đặt hiển thị', error });
    }
};

// ── Public: xem quỹ + sự kiện qua viewCode (không cần đăng nhập) ─────────────
const getClanPublic = async (req, res) => {
    try {
        const { viewCode } = req.params;
        const Member   = require('../models/Member');
        const ClanFund = require('../models/ClanFund');

        // Tìm userId qua viewCode trên Member
        const member = await Member.findOne({ viewCode }).select('createdBy').lean();
        if (!member) return res.status(404).json({ message: 'Không tìm thấy cây gia phả' });

        const userId = member.createdBy;
        const user   = await User.findById(userId).select('treeName name clanInfo events').lean();
        if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

        const funds = await ClanFund.find({ createdBy: userId, isEnabled: true }).lean();

        res.json({
            treeName:  user.treeName || user.name,
            clanInfo:  user.clanInfo || {},
            events:    user.events   || [],
            funds,
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error });
    }
};

module.exports = {
    getClanData,
    updateClanInfo,
    getEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    updateFund,
    getMemberShrinePublic,
    getShrineLog,
    burnIncense,
    offerItem,
    resetShrine,
    migrateShrine,
    getVisibilitySettings,
    updateVisibilitySettings,
    getClanPublic,
};
