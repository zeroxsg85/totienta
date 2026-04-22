const crypto = require("crypto");
const Member = require("../models/Member");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { detectAndCreateMatches } = require('./crossTreeController');

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
    getTreeInfo,
};
