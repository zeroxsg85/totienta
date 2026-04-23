const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail'); // mày phải có hàm này

// =======================
// Tạo token JWT
// =======================
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// =======================
// Đăng ký
// =======================
const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'Email đã được sử dụng' });
        }

        // Tạo token kích hoạt (raw để gửi mail, hashed để lưu DB)
        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

        const user = await User.create({
            name, email, password,
            isVerified: false,
            emailVerificationToken: hashedToken,
            emailVerificationExpire: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        });

        const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.totienta.com';
        const verifyUrl = `${APP_URL}/verify-email/${rawToken}`;

        // Gửi email kích hoạt (background)
        setTimeout(() => {
            sendEmail({
                to: user.email,
                subject: '✅ Kích hoạt tài khoản ToTienTa.com của bạn',
                html: `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
  <h2>Chào ${user.name || 'bạn'} 👋</h2>
  <p>Cảm ơn bạn đã đăng ký tại <strong>ToTienTa.com</strong>!</p>
  <p>Nhấn nút bên dưới để kích hoạt tài khoản và bắt đầu tạo cây gia phả:</p>
  <div style="text-align:center;margin:32px 0">
    <a href="${verifyUrl}"
       style="background:#0d6efd;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold">
      ✅ Kích hoạt tài khoản
    </a>
  </div>
  <p style="color:#888;font-size:13px">Link có hiệu lực trong <strong>24 giờ</strong>. Nếu bạn không đăng ký, hãy bỏ qua email này.</p>
  <hr/>
  <small style="color:#aaa">Cần hỗ trợ: 0327.691.726 (Thanh Tùng) – ToTienTa.com</small>
</div>`,
            }).catch(e => console.error('Gửi mail kích hoạt thất bại:', e));
        }, 0);

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            isVerified: false,
            token: generateToken(user._id),
        });
    } catch (error) {
        res.status(500).json({ message: 'Đã xảy ra lỗi', error });
    }
};

// =======================
// Đăng nhập
// =======================
const loginUser = async (req, res) => {
    const { email, password, twoFactorToken } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
        }

        // Nếu user đã bật 2FA
        if (user.twoFactor?.enabled) {
            // Chưa gửi mã OTP → báo client phải nhập thêm bước 2FA
            if (!twoFactorToken) {
                return res.status(200).json({ requiresTwoFactor: true });
            }

            // Có mã OTP → verify
            const speakeasy = require('speakeasy');
            const isValid = speakeasy.totp.verify({
                secret:   user.twoFactor.secret,
                encoding: 'base32',
                token:    twoFactorToken.toString().replace(/\s/g, ''),
                window:   1,
            });

            if (!isValid) {
                return res.status(401).json({ message: 'Mã xác thực không đúng. Thử lại.' });
            }
        }

        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id),
        });
    } catch (error) {
        res.status(500).json({ message: 'Đã xảy ra lỗi', error });
    }
};

// =======================
// Quên mật khẩu
// =======================
const forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'Email không tồn tại' });
        }

        // Tạo token reset
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 phút
        await user.save();

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

        await sendEmail({
            to: user.email,
            subject: 'Đặt lại mật khẩu',
            html: `
                <p>Bạn đã yêu cầu đặt lại mật khẩu.</p>
                <p>Nhấn vào link dưới đây (có hiệu lực 15 phút):</p>
                <a href="${resetUrl}">${resetUrl}</a>
            `,
        });

        res.status(200).json({ message: 'Đã gửi email đặt lại mật khẩu' });
    } catch (error) {
        res.status(500).json({ message: 'Không thể gửi email', error });
    }
};

// =======================
// Reset mật khẩu
// =======================
const resetPassword = async (req, res) => {
    const { token, password } = req.body;

    try {
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
        }

        user.password = password; // schema đã hash
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.status(200).json({ message: 'Đổi mật khẩu thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Không thể reset mật khẩu', error });
    }
};

// =======================
// Đổi mật khẩu khi đã đăng nhập (optional nhưng nên có)
// =======================
// Đổi mật khẩu khi đã đăng nhập
const changePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Thiếu dữ liệu' });
    }

    try {
        const user = await User.findById(req.user._id);

        if (!user || !(await user.matchPassword(oldPassword))) {
            return res.status(401).json({ message: 'Mật khẩu cũ không đúng' });
        }

        user.password = newPassword; // schema tự hash
        await user.save();

        res.status(200).json({ message: 'Đổi mật khẩu thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Không thể đổi mật khẩu', error });
    }
};

// Lấy thông tin profile
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy thông tin', error });
    }
};

// Cập nhật profile
const updateProfile = async (req, res) => {
    try {
        const { name, phone, address, birthday, treeName } = req.body;

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }

        user.name = name || user.name;
        user.phone = phone || user.phone;
        user.address = address || user.address;
        user.birthday = birthday || user.birthday;
        if (treeName !== undefined) user.treeName = treeName;

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            address: updatedUser.address,
            birthday: updatedUser.birthday,
            treeName: updatedUser.treeName,
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi cập nhật thông tin', error });
    }
};

// =======================
// Kích hoạt email
// =======================
const verifyEmail = async (req, res) => {
    try {
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

        const user = await User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ message: 'Link kích hoạt không hợp lệ hoặc đã hết hạn.' });
        }

        user.isVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpire = undefined;
        await user.save();

        res.json({ message: 'Tài khoản đã được kích hoạt thành công!' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error });
    }
};

// =======================
// Gửi lại email kích hoạt
// =======================
const resendVerification = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
        if (user.isVerified) return res.status(400).json({ message: 'Tài khoản đã được kích hoạt rồi' });

        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

        user.emailVerificationToken = hashedToken;
        user.emailVerificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await user.save();

        const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.totienta.com';
        const verifyUrl = `${APP_URL}/verify-email/${rawToken}`;

        await sendEmail({
            to: user.email,
            subject: '✅ Kích hoạt tài khoản ToTienTa.com của bạn',
            html: `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
  <h2>Chào ${user.name || 'bạn'} 👋</h2>
  <p>Nhấn nút bên dưới để kích hoạt tài khoản <strong>ToTienTa.com</strong>:</p>
  <div style="text-align:center;margin:32px 0">
    <a href="${verifyUrl}"
       style="background:#0d6efd;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold">
      ✅ Kích hoạt tài khoản
    </a>
  </div>
  <p style="color:#888;font-size:13px">Link có hiệu lực trong <strong>24 giờ</strong>.</p>
  <hr/>
  <small style="color:#aaa">ToTienTa.com</small>
</div>`,
        });

        res.json({ message: 'Đã gửi lại email kích hoạt!' });
    } catch (error) {
        res.status(500).json({ message: 'Không thể gửi email', error });
    }
};

module.exports = {
    registerUser,
    loginUser,
    forgotPassword,
    resetPassword,
    changePassword,
    getProfile,
    updateProfile,
    verifyEmail,
    resendVerification,
};