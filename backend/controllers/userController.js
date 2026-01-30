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

        const user = await User.create({ name, email, password });

        res.status(201).json({
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
// Đăng nhập
// =======================
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
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

module.exports = {
    registerUser,
    loginUser,
    forgotPassword,
    resetPassword,
    changePassword,
};