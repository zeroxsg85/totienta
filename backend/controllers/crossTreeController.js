const Member = require('../models/Member');
const CrossTreeMatch = require('../models/CrossTreeMatch');
const CrossTreeLink = require('../models/CrossTreeLink');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Tính điểm & fields trùng giữa 2 member
// ─────────────────────────────────────────────────────────────────────────────
function calcMatch(a, b) {
  const fields = [];
  let score = 0;

  // idCard trùng chính xác → độ tin cậy cao nhất
  if (a.idCard?.number && b.idCard?.number && a.idCard.number === b.idCard.number) {
    fields.push('idCard'); score += 50;
  }
  // Số điện thoại trùng
  if (a.phoneNumber && b.phoneNumber && a.phoneNumber === b.phoneNumber) {
    fields.push('phone'); score += 30;
  }
  // Tên + năm sinh gần (±1 năm)
  if (a.name && b.name) {
    const nameA = a.name.toLowerCase().trim();
    const nameB = b.name.toLowerCase().trim();
    const nameMatch = nameA === nameB || nameA.includes(nameB) || nameB.includes(nameA);
    if (nameMatch) {
      const yearA = a.birthday?.solar ? new Date(a.birthday.solar).getFullYear() : null;
      const yearB = b.birthday?.solar ? new Date(b.birthday.solar).getFullYear() : null;
      if (yearA && yearB && Math.abs(yearA - yearB) <= 1) {
        fields.push('name+birthday'); score += 40;
      } else {
        fields.push('name'); score += 15;
      }
    }
  }

  return { fields, score };
}

// ─────────────────────────────────────────────────────────────────────────────
// Detect & tạo CrossTreeMatch khi member được tạo/cập nhật
// Gọi nội bộ từ memberController (không phải route trực tiếp)
// ─────────────────────────────────────────────────────────────────────────────
const detectAndCreateMatches = async (member, userId) => {
  try {
    const orConditions = [];

    if (member.idCard?.number)
      orConditions.push({ 'idCard.number': member.idCard.number });
    if (member.phoneNumber)
      orConditions.push({ phoneNumber: member.phoneNumber });
    if (member.name) {
      const nameRegex = new RegExp(member.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      orConditions.push({ name: nameRegex });
    }

    if (orConditions.length === 0) return;

    const candidates = await Member.find({
      createdBy: { $ne: userId },
      $or: orConditions,
    }).lean();

    for (const candidate of candidates) {
      // Bỏ qua nếu match đã tồn tại
      const existing = await CrossTreeMatch.findOne({
        $or: [
          { memberA: member._id, memberB: candidate._id },
          { memberA: candidate._id, memberB: member._id },
        ],
      });
      if (existing) continue;

      const { fields, score } = calcMatch(member, candidate);
      if (score < 15) continue; // Quá thấp, bỏ qua

      await CrossTreeMatch.create({
        treeOwnerA:  userId,
        memberA:     member._id,
        viewCodeA:   member.viewCode,
        memberAName: member.name,
        treeOwnerB:  candidate.createdBy,
        memberB:     candidate._id,
        viewCodeB:   candidate.viewCode,
        memberBName: candidate.name,
        matchFields: fields,
        matchScore:  Math.min(score, 100),
      });
    }
  } catch (err) {
    console.error('detectAndCreateMatches error:', err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Auto-suggest các member lân cận sau khi xác nhận 1 cặp trùng
// ─────────────────────────────────────────────────────────────────────────────
const suggestAdjacentMatches = async (confirmedMatch) => {
  try {
    const [memberA, memberB] = await Promise.all([
      Member.findById(confirmedMatch.memberA).lean(),
      Member.findById(confirmedMatch.memberB).lean(),
    ]);
    if (!memberA || !memberB) return;

    // Lấy member lân cận (cha, con) của mỗi bên
    const [adjA, adjB] = await Promise.all([
      Member.find({
        createdBy: confirmedMatch.treeOwnerA,
        $or: [{ _id: memberA.parent }, { parent: memberA._id }],
      }).lean(),
      Member.find({
        createdBy: confirmedMatch.treeOwnerB,
        $or: [{ _id: memberB.parent }, { parent: memberB._id }],
      }).lean(),
    ]);

    for (const a of adjA) {
      for (const b of adjB) {
        const existing = await CrossTreeMatch.findOne({
          $or: [
            { memberA: a._id, memberB: b._id },
            { memberA: b._id, memberB: a._id },
          ],
        });
        if (existing) continue;

        const { fields, score } = calcMatch(a, b);
        if (score < 15) continue;

        await CrossTreeMatch.create({
          treeOwnerA:  confirmedMatch.treeOwnerA,
          memberA:     a._id,
          viewCodeA:   confirmedMatch.viewCodeA,
          memberAName: a.name,
          treeOwnerB:  confirmedMatch.treeOwnerB,
          memberB:     b._id,
          viewCodeB:   confirmedMatch.viewCodeB,
          memberBName: b.name,
          matchFields: fields,
          matchScore:  Math.min(score, 100),
          autoSuggestedFrom: confirmedMatch._id,
        });
      }
    }
  } catch (err) {
    console.error('suggestAdjacentMatches error:', err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /cross-tree/matches  – Danh sách matches của user hiện tại
// ─────────────────────────────────────────────────────────────────────────────
const getMyMatches = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { status } = req.query; // 'pending' | 'confirmed' | 'denied' | all

    const filter = {
      $or: [{ treeOwnerA: userId }, { treeOwnerB: userId }],
    };
    if (status && status !== 'all') filter.status = status;

    const matches = await CrossTreeMatch.find(filter)
      .populate('memberA', 'name birthday gender avatar')
      .populate('memberB', 'name birthday gender avatar')
      .sort({ createdAt: -1 })
      .lean();

    // Thêm metadata: user là bên A hay B, đã confirm/deny chưa
    const enriched = matches.map((m) => {
      const isA = m.treeOwnerA?.toString() === userId;
      return {
        ...m,
        myRole:       isA ? 'A' : 'B',
        myMember:     isA ? m.memberA : m.memberB,
        theirMember:  isA ? m.memberB : m.memberA,
        theirViewCode: isA ? m.viewCodeB : m.viewCodeA,
        myConfirmed:  isA ? m.confirmedByA : m.confirmedByB,
        myDenied:     isA ? m.deniedByA    : m.deniedByB,
        theirConfirmed: isA ? m.confirmedByB : m.confirmedByA,
      };
    });

    res.json({ matches: enriched });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /cross-tree/matches/count  – Badge count cho Navbar
// ─────────────────────────────────────────────────────────────────────────────
const getMatchCount = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    // Đếm những match mà user chưa action (chưa confirm/deny)
    const count = await CrossTreeMatch.countDocuments({
      status: 'pending',
      $or: [
        { treeOwnerA: userId, confirmedByA: false, deniedByA: false },
        { treeOwnerB: userId, confirmedByB: false, deniedByB: false },
      ],
    });

    res.json({ count });
  } catch (err) {
    res.status(500).json({ count: 0 });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /cross-tree/matches/:id/confirm
// ─────────────────────────────────────────────────────────────────────────────
const confirmMatch = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const match = await CrossTreeMatch.findById(req.params.id);
    if (!match) return res.status(404).json({ message: 'Không tìm thấy' });

    const isA = match.treeOwnerA?.toString() === userId;
    const isB = match.treeOwnerB?.toString() === userId;
    if (!isA && !isB) return res.status(403).json({ message: 'Không có quyền' });

    if (isA) match.confirmedByA = true;
    if (isB) match.confirmedByB = true;

    // Cả 2 đã confirm → tạo/cập nhật CrossTreeLink
    if (match.confirmedByA && match.confirmedByB) {
      match.status = 'confirmed';

      let link = await CrossTreeLink.findOne({
        $or: [
          { treeOwnerA: match.treeOwnerA, treeOwnerB: match.treeOwnerB },
          { treeOwnerA: match.treeOwnerB, treeOwnerB: match.treeOwnerA },
        ],
        status: 'active',
      });

      if (!link) {
        link = await CrossTreeLink.create({
          treeOwnerA:  match.treeOwnerA,
          treeOwnerB:  match.treeOwnerB,
          viewCodeA:   match.viewCodeA,
          viewCodeB:   match.viewCodeB,
          linkedPairs: [{ memberA: match.memberA, memberB: match.memberB }],
        });
      } else {
        // Thêm cặp mới vào link hiện có
        const already = link.linkedPairs.some(
          (p) => p.memberA?.toString() === match.memberA?.toString() ||
                 p.memberB?.toString() === match.memberB?.toString()
        );
        if (!already) {
          link.linkedPairs.push({ memberA: match.memberA, memberB: match.memberB });
          await link.save();
        }
      }

      match.crossTreeLinkId = link._id;

      // Tự động gợi ý các member lân cận
      await suggestAdjacentMatches(match);
    }

    await match.save();
    res.json({ match, bothConfirmed: match.status === 'confirmed' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /cross-tree/matches/:id/deny
// ─────────────────────────────────────────────────────────────────────────────
const denyMatch = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const match = await CrossTreeMatch.findById(req.params.id);
    if (!match) return res.status(404).json({ message: 'Không tìm thấy' });

    const isA = match.treeOwnerA?.toString() === userId;
    const isB = match.treeOwnerB?.toString() === userId;
    if (!isA && !isB) return res.status(403).json({ message: 'Không có quyền' });

    if (isA) match.deniedByA = true;
    if (isB) match.deniedByB = true;
    match.status = 'denied'; // 1 bên từ chối là đủ để đánh dấu denied

    await match.save();
    res.json({ match });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /cross-tree/links  – Danh sách cây đã kết nối
// ─────────────────────────────────────────────────────────────────────────────
const getMyLinks = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    const links = await CrossTreeLink.find({
      $or: [{ treeOwnerA: userId }, { treeOwnerB: userId }],
      status: 'active',
    })
      .populate('treeOwnerA', 'name treeName')
      .populate('treeOwnerB', 'name treeName')
      .populate({
        path: 'linkedPairs.memberA',
        select: 'name birthday gender avatar',
      })
      .populate({
        path: 'linkedPairs.memberB',
        select: 'name birthday gender avatar',
      })
      .lean();

    res.json({ links });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /cross-tree/tree/:viewCode  – Lấy thông tin cây liên kết để hiển thị mở rộng
// ─────────────────────────────────────────────────────────────────────────────
const getLinkedTreeInfo = async (req, res) => {
  try {
    const { viewCode } = req.params;
    const userId = req.user._id.toString();

    // Tìm cây của user hiện tại
    const myMember = await Member.findOne({ viewCode, createdBy: userId }).lean();
    if (!myMember) return res.status(404).json({ message: 'Không tìm thấy cây' });

    const link = await CrossTreeLink.findOne({
      $or: [
        { treeOwnerA: userId, viewCodeA: viewCode },
        { treeOwnerB: userId, viewCodeB: viewCode },
      ],
      status: 'active',
    })
      .populate('treeOwnerA', 'name treeName')
      .populate('treeOwnerB', 'name treeName')
      .lean();

    if (!link) return res.json({ link: null });

    // Xác định bên kia
    const isA = link.treeOwnerA?._id?.toString() === userId;
    const otherViewCode = isA ? link.viewCodeB : link.viewCodeA;
    const otherOwner   = isA ? link.treeOwnerB : link.treeOwnerA;

    // Lấy members của cây kia (public info chỉ)
    const otherMembers = await Member.find({ viewCode: otherViewCode })
      .select('name gender birthday avatar parent children isAlive')
      .lean();

    res.json({
      link,
      otherOwner,
      otherViewCode,
      otherMembers,
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

module.exports = {
  detectAndCreateMatches,
  getMyMatches,
  getMatchCount,
  confirmMatch,
  denyMatch,
  getMyLinks,
  getLinkedTreeInfo,
};
