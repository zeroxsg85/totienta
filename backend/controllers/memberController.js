const crypto = require("crypto");
const Member = require("../models/Member");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { detectAndCreateMatches } = require('./crossTreeController');
const { lunarDayMonthToSolarInYear } = require('../utils/lunarCalendar');

const uploadMemberAvatar = async (req, res) => {
    let { _id } = req.body;

    // Ép kiểu nếu dữ liệu bị sai định dạng
    if (typeof _id === "object") {
        _id = JSON.parse(_id);
    }

    if (!_id) {
        console.error("❌ Thiếu thông tin _id của thành viên.");
        return res.status(400).json({ message: "Thiếu thông tin _id của thành viên." });
    }

    if (!req.file) {
        console.error("❌ Không có tệp tin nào được tải lên.");
        return res.status(400).json({ message: "Không có tệp tin nào được tải lên." });
    }

    try {
        // 📌 Tìm thành viên trong database
        const member = await Member.findById(_id);
        if (!member) {
            return res.status(404).json({ message: "Không tìm thấy thành viên." });
        }

        const userId = member.createdBy.toString(); // Lấy ID người tạo

        // 📌 Xác định thư mục lưu ảnh
        const memberDir = path.join(__dirname, `../../uploads/avatars/${userId}/${_id}`);
        if (!fs.existsSync(memberDir)) {
            fs.mkdirSync(memberDir, { recursive: true });
        }

        // 📌 Xóa ảnh cũ nếu có
        if (member.avatar) {
            const oldAvatarPath = path.join(__dirname, `../../${member.avatar}`);
            if (fs.existsSync(oldAvatarPath)) {
                fs.unlinkSync(oldAvatarPath);
            }
        }

        const timestamp = Date.now();
        const newFileName = `avatar-${_id}-${timestamp}.png`;
        const filePath = path.join(memberDir, newFileName);

        // 📌 Xử lý hình ảnh (resize, nén, lưu)
        const buffer = await sharp(req.file.buffer)
            .resize({ width: 300, height: 300 }) // Resize ảnh về kích thước hợp lý
            .png({ quality: 90 })
            .toBuffer();

        fs.writeFileSync(filePath, buffer);

        // 📌 Đường dẫn avatar mới
        const avatarPath = `uploads/avatars/${userId}/${_id}/${newFileName}`;

        // 📌 Cập nhật avatar vào database
        member.avatar = avatarPath;
        await member.save();

        res.status(200).json({ message: "Ảnh đại diện đã được cập nhật.", avatar: avatarPath });

    } catch (error) {
        console.error("Lỗi khi tải lên avatar:", error);
        res.status(500).json({ message: "Không thể tải lên avatar.", error });
    }
};

// ── Album ảnh ──────────────────────────────────────────────────────────────────
const uploadAlbumPhoto = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) return res.status(400).json({ message: 'Không có file' });

        const member = await Member.findOne({ _id: id, createdBy: req.user._id });
        if (!member) return res.status(404).json({ message: 'Không tìm thấy thành viên' });

        const userId = req.user._id.toString();
        const albumDir = path.join(__dirname, `../../uploads/albums/${userId}/${id}`);
        if (!fs.existsSync(albumDir)) fs.mkdirSync(albumDir, { recursive: true });

        const fileName = `photo-${Date.now()}.jpg`;
        const buffer = await sharp(req.file.buffer)
            .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toBuffer();

        fs.writeFileSync(path.join(albumDir, fileName), buffer);

        const photoPath = `uploads/albums/${userId}/${id}/${fileName}`;
        if (!member.customFields) member.customFields = [];
        member.customFields.push({ label: '', type: 'image', value: photoPath });
        await member.save();

        res.json({ customFields: member.customFields });
    } catch (error) {
        console.error('[uploadAlbumPhoto]', error);
        res.status(500).json({ message: 'Lỗi khi upload ảnh album', error: error.message });
    }
};

const deleteAlbumPhoto = async (req, res) => {
    try {
        const { id, fieldIdx } = req.params;
        const idx = parseInt(fieldIdx, 10);

        const member = await Member.findOne({ _id: id, createdBy: req.user._id });
        if (!member) return res.status(404).json({ message: 'Không tìm thấy thành viên' });

        const field = member.customFields?.[idx];
        if (!field || field.type !== 'image') return res.status(404).json({ message: 'Không tìm thấy ảnh' });

        if (field.value) {
            const filePath = path.join(__dirname, `../../${field.value}`);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        member.customFields.splice(idx, 1);
        await member.save();

        res.json({ customFields: member.customFields });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi xóa ảnh album', error });
    }
};

// Tạo hoặc cập nhật mã xác thực
const generateViewCode = async (req, res) => {
    try {
        const userId = req.user._id;

        //Kiểm tra xem người dùng đã tạo thành viên nào chưa
        const members = await Member.find({ createdBy: userId });

        if (!members.length) {
            return res.status(404).json({ message: "Bạn chưa tạo cây gia phả nào" });
        }

        //Luôn tạo mã xác thực mới
        const newViewCode = crypto.randomBytes(4).toString("hex").toUpperCase(); // VD: "A1B2C3D4"

        //Cập nhật toàn bộ cây gia phả của người dùng với `newViewCode`
        await Member.updateMany({ createdBy: userId }, { $set: { viewCode: newViewCode } });

        res.status(200).json({ viewCode: newViewCode });
    } catch (error) {
        console.error("Lỗi khi tạo mã xác thực:", error);
        res.status(500).json({ message: "Lỗi khi tạo mã xác thực", error });
    }
};

const updateViewCode = async (req, res) => {
    try {
        const userId = req.user._id;

        // 🔍 Tìm một thành viên có viewCode (cùng createdBy)
        const memberWithViewCode = await Member.findOne({ createdBy: userId, viewCode: { $exists: true } });

        if (!memberWithViewCode) {
            return res.status(404).json({ message: "❌ Không tìm thấy thành viên nào có mã xác thực" });
        }

        const existingViewCode = memberWithViewCode.viewCode;

        // 📌 Cập nhật tất cả thành viên chưa có viewCode
        const result = await Member.updateMany(
            { createdBy: userId, viewCode: { $exists: false } }, // Chỉ cập nhật những thành viên chưa có viewCode
            { $set: { viewCode: existingViewCode } }
        );

        res.status(200).json({ message: "✅ Đã cập nhật mã xác thực", viewCode: existingViewCode });
    } catch (error) {
        console.error("🚨 Lỗi khi cập nhật mã xác thực:", error);
        res.status(500).json({ message: "Lỗi khi cập nhật mã xác thực", error });
    }
};


const getViewCode = async (req, res) => {
    try {
        const userId = req.user._id;

        // Lấy 1 thành viên bất kỳ do user tạo để kiểm tra `viewCode`
        const anyMember = await Member.findOne({ createdBy: userId }).select("viewCode");

        if (!anyMember || !anyMember.viewCode) {
            // User mới chưa có viewCode - trả về rỗng, không phải lỗi
            return res.status(200).json({ viewCode: null });
        }

        res.status(200).json({ viewCode: anyMember.viewCode });
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi lấy mã xác thực", error });
    }
};

// ── Visibility helpers ────────────────────────────────────────────────────────
const VISIBILITY_FIELDS = ['phoneNumber', 'birthday', 'address', 'idCard', 'occupation',
    'hometown', 'religion', 'spouse', 'memorial', 'burial', 'legacy', 'shrine'];
const LEVEL_ORDER = { public: 0, login: 1, member: 2 };

function applyVisibility(memberObj, level, settings = {}) {
    const userLevel = LEVEL_ORDER[level] ?? 0;
    const filtered = { ...memberObj };
    VISIBILITY_FIELDS.forEach((field) => {
        const required = settings[field] || (
            ['occupation', 'hometown', 'religion', 'memorial'].includes(field) ? 'public' : 'member'
        );
        if (userLevel < (LEVEL_ORDER[required] ?? 0)) {
            delete filtered[field];
        }
    });
    return filtered;
}

// Kiểm tra mã xác thực hợp lệ và lấy cây gia phả (với visibility filtering)
const getFamilyTreeByViewCode = async (req, res) => {
    try {
        const { viewCode } = req.params;
        const User = require('../models/User');
        const jwt = require('jsonwebtoken');

        // Lấy tất cả thành viên
        const members = await Member.find({ viewCode });
        if (!members.length) return res.status(200).json([]);

        // Xác định treeOwner
        const treeOwnerId = members[0]?.createdBy?.toString();

        // Xác định access level của người gọi
        let level = 'public';
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            try {
                const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
                const callerId = (decoded.id || decoded._id)?.toString();
                level = callerId === treeOwnerId ? 'member' : 'login';
            } catch { /* token không hợp lệ → public */ }
        }

        // Lấy visibility settings của owner
        let visSettings = {};
        if (treeOwnerId) {
            const owner = await User.findById(treeOwnerId).select('visibilitySettings');
            visSettings = owner?.visibilitySettings?.toObject?.() || owner?.visibilitySettings || {};
        }

        // Tạo bản đồ thành viên (đã filter visibility)
        const memberMap = new Map();
        members.forEach((m) => {
            const obj = applyVisibility(m.toObject(), level, visSettings);
            memberMap.set(m._id.toString(), { ...obj, children: [] });
        });

        // Liên kết cha/mẹ
        members.forEach((m) => {
            if (m.parent) {
                const parent = memberMap.get(m.parent.toString());
                if (parent) parent.children.push(memberMap.get(m._id.toString()));
            }
        });

        const rootMembers = Array.from(memberMap.values()).filter((m) => !m.parent);
        res.status(200).json(rootMembers);
    } catch (error) {
        res.status(500).json({ message: 'Không thể lấy cây gia phả', error });
    }
};

// Lấy danh sách tất cả thành viên của người dùng hiện tại
const getAllMembers = async (req, res) => {
    try {
        const filter = { createdBy: req.user._id };
        // B7: Hỗ trợ tìm kiếm theo tên
        if (req.query.search) {
            filter.name = { $regex: req.query.search.trim(), $options: 'i' };
        }
        const members = await Member.find(filter).populate('parent spouse children');
        res.status(200).json(members);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy danh sách thành viên', error });
    }
};


// Thêm thành viên mới (hỗ trợ thêm CHA/MẸ cho root)
const createMember = async (req, res) => {
    // Guard: tài khoản phải kích hoạt email trước
    if (!req.user.isVerified) {
        return res.status(403).json({
            message: 'Bạn cần kích hoạt tài khoản qua email trước khi thêm thành viên.',
            code: 'EMAIL_NOT_VERIFIED',
        });
    }

    try {
        const {
            name,
            gender,
            birthday,
            maritalStatus,
            isAlive,
            phoneNumber,
            address,
            occupation,
            hometown,
            religion,
            spouse,
            deathDate,
            anniversaryDate,
            memorial,
            burial,
            shrine,
            legacy,
            parent,      // dùng khi thêm CON
            children = [], // dùng khi thêm CHA/MẸ
            customFields = []
        } = req.body;

        // Tạo member mới
        const newMember = new Member({
            name,
            gender,
            birthday: birthday || undefined,
            maritalStatus,
            isAlive,
            phoneNumber,
            address,
            occupation,
            hometown,
            religion,
            spouse: maritalStatus === 'married' ? spouse : [],
            deathDate: isAlive ? undefined : (deathDate || undefined),
            anniversaryDate: anniversaryDate || undefined,
            memorial: memorial || undefined,
            burial: burial || undefined,
            shrine: shrine || undefined,
            legacy: legacy || undefined,
            parent: parent || null,
            children: children || [],
            customFields,
            createdBy: req.user._id,
        });

        const savedMember = await newMember.save();

        // ===== THÊM CON (logic cũ, giữ nguyên) =====
        if (parent) {
            await Member.findByIdAndUpdate(parent, {
                $push: { children: savedMember._id },
            });
        }

        // ===== THÊM CHA/MẸ (logic mới, QUAN TRỌNG) =====
        if (!parent && children.length > 0) {
            await Member.updateMany(
                { _id: { $in: children } },
                { parent: savedMember._id }
            );
        }

        res.status(201).json(savedMember);

        // Async: phát hiện trùng với các cây khác (không block response)
        detectAndCreateMatches(savedMember.toObject(), req.user._id.toString()).catch(() => {});
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi thêm thành viên', error });
    }
};


// Cập nhật thông tin thành viên
const updateMember = async (req, res) => {
    try {
        const member = await Member.findOne({ _id: req.params.id, createdBy: req.user._id });
        if (!member) {
            return res.status(404).json({ message: 'Member not found or not authorized' });
        }

        const updateData = req.body;

        // Nếu isAlive === false thì bắt buộc phải có ngày mất (solar)
        if (updateData.isAlive === false && !updateData.deathDate?.solar) {
            updateData.deathDate = { solar: new Date() };
        }

        const updatedMember = await Member.findByIdAndUpdate(req.params.id, updateData, { new: true });

        res.status(200).json(updatedMember);

        // Async: re-check trùng sau khi cập nhật
        detectAndCreateMatches(updatedMember.toObject(), req.user._id.toString()).catch(() => {});
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi cập nhật thành viên', error });
    }
};


// Xóa thành viên
const deleteMember = async (req, res) => {
    try {
        const member = await Member.findOne({ _id: req.params.id, createdBy: req.user._id });
        if (!member) {
            return res.status(404).json({ message: 'Không tìm thấy thành viên hoặc không có quyền xóa' });
        }

        // Kiểm tra nếu thành viên có con thì không cho phép xóa
        if (member.children.length > 0) {
            return res.status(400).json({ message: 'Không thể xóa thành viên có con' });
        }

        // Xóa ID của thành viên khỏi danh sách children của cha
        if (member.parent) {
            await Member.findByIdAndUpdate(member.parent, {
                $pull: { children: member._id } // Loại bỏ ID của thành viên khỏi danh sách con của cha
            });
        }

        // Cập nhật parent của thành viên về null trước khi xóa
        await Member.findByIdAndUpdate(member._id, { parent: null });

        // Xóa thành viên
        await Member.findByIdAndDelete(member._id);

        res.status(200).json({ message: 'Thành viên đã bị xóa thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi xóa thành viên', error });
    }
};


const getFamilyTree = async (req, res) => {
    try {
        const userId = req.user._id;

        // Lấy tất cả thành viên của người dùng và populate children
        const members = await Member.find({ createdBy: userId }).populate({
            path: 'children', // Populate các đối tượng children
            populate: { path: 'children' }, // Populate đệ quy (nếu có con cháu)
        });

        // Tạo bản đồ thành viên
        const memberMap = new Map();
        members.forEach((member) => {
            memberMap.set(member._id.toString(), { ...member.toObject(), children: [] });
        });

        // Liên kết các thành viên với cha/mẹ
        members.forEach((member) => {
            if (member.parent) {
                const parent = memberMap.get(member.parent.toString());
                if (parent) {
                    parent.children.push(memberMap.get(member._id.toString()));
                }
            }
        });

        // Lọc ra thành viên gốc (không có cha/mẹ)
        const rootMembers = Array.from(memberMap.values()).filter((member) => !member.parent);
        res.status(200).json(rootMembers);
    } catch (error) {
        res.status(500).json({ message: 'Không thể lấy cây gia phả', error });
    }
};



// Lấy danh sách tất cả thành viên
const getAllMembersFlat = async (req, res) => {
    try {
        const userId = req.user._id;
        const members = await Member.find({ createdBy: userId }).select('_id name');
        res.status(200).json(members);
    } catch (error) {
        res.status(500).json({ message: 'Không thể lấy danh sách thành viên', error });
    }
};

// Lấy thông tin cây gia phả qua viewCode (public)
const getTreeInfo = async (req, res) => {
    try {
        const { viewCode } = req.params;

        const member = await Member.findOne({ viewCode });
        if (!member) {
            return res.status(404).json({ message: 'Không tìm thấy cây gia phả' });
        }

        const user = await require('../models/User').findById(member.createdBy).select('treeName name');

        res.json({
            treeName: user?.treeName || '',
            ownerName: user?.name || '',
            viewCode,
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy thông tin', error });
    }
};
/**
 * B7: Tìm mình trong toàn bộ app (search global, không phải chỉ cây của mình)
 * Trả về member + viewCode + tên cây để user biết mình đã được thêm vào đâu
 */
const searchGlobal = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 2) {
            return res.json({ results: [] });
        }

        const User = require('../models/User');
        const myId = req.user._id.toString();

        // Tìm member ở TẤT CẢ các cây (kể cả cây của mình)
        const members = await Member.find({
            name: { $regex: q.trim(), $options: 'i' },
        })
            .select('name gender birthday viewCode createdBy')
            .limit(30)
            .lean();

        if (!members.length) return res.json({ results: [] });

        // Lấy thông tin chủ cây (treeName, name) theo batch
        const ownerIds = [...new Set(members.map((m) => m.createdBy?.toString()))];
        const owners = await User.find({ _id: { $in: ownerIds } }).select('_id name treeName').lean();
        const ownerMap = Object.fromEntries(owners.map((o) => [o._id.toString(), o]));

        const results = members.map((m) => {
            const owner = ownerMap[m.createdBy?.toString()] || {};
            return {
                _id: m._id,
                name: m.name,
                gender: m.gender,
                birthday: m.birthday,
                viewCode: m.viewCode,
                treeName: owner.treeName || owner.name || 'Không tên',
                isMyTree: m.createdBy?.toString() === myId,
            };
        });

        res.json({ results });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi tìm kiếm', error });
    }
};

// ── Sự kiện sắp tới ──────────────────────────────────────────────────────────
// Tên lưu dạng "Gia Phả-Khai Sinh-Thường Gọi", chỉ lấy phần Khai Sinh
function getCivilName(name) {
    if (!name) return '';
    const parts = name.split('-').map(p => p.trim());
    return parts.length >= 2 ? parts[1] : name;
}

const getUpcomingEvents = async (req, res) => {
    try {
        const User = require('../models/User');
        const members = await Member.find({ createdBy: req.user._id })
            .select('name isAlive birthday deathDate anniversaryDate shrine viewCode')
            .lean();
        const user = await User.findById(req.user._id).select('events').lean();
        const clanEvents = user?.events || [];

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const todayY = now.getFullYear();
        const todayM = now.getMonth() + 1; // 1-12
        const todayD = now.getDate();

        // Ngày cuối tuần (7 ngày tới) và cuối tháng
        const weekEnd  = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);
        const monthEnd = new Date(todayY, todayM, 0); // ngày cuối tháng hiện tại

        const events = [];

        // ── Thành viên ──────────────────────────────────────────────────────────
        for (const m of members) {
            const pick = { _id: m._id, name: m.name, isAlive: m.isAlive, viewCode: m.viewCode };

            // Sinh nhật (solar): cần đủ ngày/tháng/năm
            if (m.isAlive !== false && m.birthday?.solar) {
                const bd = new Date(m.birthday.solar);
                if (!isNaN(bd.getTime())) {
                    const bdMonth = bd.getMonth() + 1;
                    const bdDay   = bd.getDate();
                    if (bdMonth && bdDay) {
                        const thisYearBd = new Date(todayY, bdMonth - 1, bdDay);
                        events.push({
                            type:   'birthday',
                            member: pick,
                            date:   thisYearBd,
                            label:  `Sinh nhật ${getCivilName(m.name)}`,
                        });
                    }
                }
            }

            // Ngày giỗ – ưu tiên: anniversaryDate.lunar → deathDate.solar → deathDate.lunar
            if (m.isAlive === false) {
                const ann = m.anniversaryDate?.lunar;
                if (ann?.day && ann?.month) {
                    // 1) Có ngày giỗ âm lịch riêng → chuyển sang dương
                    const solar = lunarDayMonthToSolarInYear(ann.day, ann.month, todayY);
                    if (solar) {
                        events.push({
                            type:       'anniversary',
                            member:     pick,
                            date:       solar,
                            label:      `Giỗ ${getCivilName(m.name)}`,
                            lunarDay:   ann.day,
                            lunarMonth: ann.month,
                        });
                    }
                } else if (m.deathDate?.solar) {
                    // 2) Có ngày mất dương lịch → dùng ngày/tháng đó hàng năm
                    const dd = new Date(m.deathDate.solar);
                    if (!isNaN(dd.getTime())) {
                        const ddMonth = dd.getMonth() + 1;
                        const ddDay   = dd.getDate();
                        if (ddMonth && ddDay) {
                            events.push({
                                type:   'anniversary',
                                member: pick,
                                date:   new Date(todayY, ddMonth - 1, ddDay),
                                label:  `Giỗ ${getCivilName(m.name)}`,
                            });
                        }
                    }
                } else if (m.deathDate?.lunar?.day && m.deathDate?.lunar?.month) {
                    // 3) Có ngày mất âm lịch → chuyển sang dương
                    const dl = m.deathDate.lunar;
                    const solar = lunarDayMonthToSolarInYear(dl.day, dl.month, todayY);
                    if (solar) {
                        events.push({
                            type:       'anniversary',
                            member:     pick,
                            date:       solar,
                            label:      `Giỗ ${m.name}`,
                            lunarDay:   dl.day,
                            lunarMonth: dl.month,
                        });
                    }
                }
            }
        }

        // ── Sự kiện dòng họ ────────────────────────────────────────────────────
        for (const ev of clanEvents) {
            // Dùng ngày dương nếu có, ưu tiên date trước lunarDate
            if (ev.date) {
                const d = new Date(ev.date);
                if (!isNaN(d.getTime())) {
                    // Sự kiện hàng năm: dùng tháng/ngày của năm này
                    const recurring = new Date(todayY, d.getMonth(), d.getDate());
                    events.push({ type: 'clan', label: ev.title, date: recurring, eventType: ev.type });
                }
            }
        }

        // ── Phân loại ──────────────────────────────────────────────────────────
        function inRange(d, from, to) {
            const t = new Date(d); t.setHours(0,0,0,0);
            return t >= from && t <= to;
        }

        const isToday    = (d) => { const t = new Date(d); t.setHours(0,0,0,0); return t.getTime() === now.getTime(); };
        const isThisWeek = (d) => inRange(d, now, weekEnd);
        const isThisMonth= (d) => { const t = new Date(d); return t.getFullYear() === todayY && t.getMonth() + 1 === todayM; };

        const sortByDate = (arr) => arr.slice().sort((a,b) => new Date(a.date) - new Date(b.date));

        const serialize = (e) => ({ ...e, date: e.date instanceof Date ? e.date.toISOString().slice(0,10) : e.date });

        res.json({
            today:     sortByDate(events.filter(e => isToday(e.date))).map(serialize),
            thisWeek:  sortByDate(events.filter(e => isThisWeek(e.date) && !isToday(e.date))).map(serialize),
            thisMonth: sortByDate(events.filter(e => isThisMonth(e.date) && !isThisWeek(e.date))).map(serialize),
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy sự kiện', error });
    }
};

module.exports = {
    getFamilyTree,
    getAllMembers,
    createMember,
    updateMember,
    deleteMember,
    getAllMembersFlat,
    getFamilyTreeByViewCode,
    generateViewCode,
    getViewCode,
    updateViewCode,
    uploadMemberAvatar,
    uploadAlbumPhoto,
    deleteAlbumPhoto,
    getTreeInfo,
    searchGlobal,
    getUpcomingEvents,
};
