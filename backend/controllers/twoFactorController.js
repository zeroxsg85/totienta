const speakeasy = require('speakeasy');
const QRCode    = require('qrcode');
const User      = require('../models/User');

const APP_NAME  = 'ToTienTa';

// ─────────────────────────────────────────────────────────────────────────────
// POST /users/2fa/setup
// Tạo secret + QR code URI. Chưa bật 2FA — chỉ trả về QR để user quét.
// ─────────────────────────────────────────────────────────────────────────────
const setup2FA = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

        if (user.twoFactor?.enabled) {
            return res.status(400).json({ message: '2FA đã được bật rồi' });
        }

        // Tạo secret mới (chưa lưu vào DB — chờ verify xong mới lưu)
        const secret = speakeasy.generateSecret({
            name: `${APP_NAME} (${user.email})`,
            length: 20,
        });

        // Tạm lưu secret vào DB (chưa enabled)
        user.twoFactor = { enabled: false, secret: secret.base32 };
        await user.save();

        // Tạo QR code dạng data URL (base64 PNG)
        const otpauthUrl = secret.otpauth_url;
        const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

        res.json({
            qrCode:     qrCodeDataUrl,   // base64 PNG để hiển thị thẳng vào <img>
            manualCode: secret.base32,   // Fallback nhập tay nếu không quét được
        });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /users/2fa/verify   { token: '123456' }
// Xác nhận mã OTP đúng → bật 2FA chính thức
// ─────────────────────────────────────────────────────────────────────────────
const verify2FA = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ message: 'Thiếu mã OTP' });

        const user = await User.findById(req.user._id);
        if (!user?.twoFactor?.secret) {
            return res.status(400).json({ message: 'Chưa khởi tạo 2FA. Hãy setup trước.' });
        }

        const isValid = speakeasy.totp.verify({
            secret:   user.twoFactor.secret,
            encoding: 'base32',
            token:    token.toString().replace(/\s/g, ''),
            window:   1, // chấp nhận ±30s lệch giờ
        });

        if (!isValid) {
            return res.status(400).json({ message: 'Mã OTP không đúng. Thử lại.' });
        }

        user.twoFactor.enabled = true;
        await user.save();

        res.json({ message: '2FA đã được bật thành công!' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /users/2fa/disable   { token: '123456' }
// Tắt 2FA — yêu cầu nhập mã OTP hiện tại để xác nhận
// ─────────────────────────────────────────────────────────────────────────────
const disable2FA = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ message: 'Nhập mã OTP từ app để tắt 2FA' });

        const user = await User.findById(req.user._id);
        if (!user?.twoFactor?.enabled) {
            return res.status(400).json({ message: '2FA chưa được bật' });
        }

        const isValid = speakeasy.totp.verify({
            secret:   user.twoFactor.secret,
            encoding: 'base32',
            token:    token.toString().replace(/\s/g, ''),
            window:   1,
        });

        if (!isValid) {
            return res.status(400).json({ message: 'Mã OTP không đúng' });
        }

        user.twoFactor = { enabled: false, secret: null };
        await user.save();

        res.json({ message: '2FA đã được tắt' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /users/2fa/status
// Trả về trạng thái 2FA của user hiện tại
// ─────────────────────────────────────────────────────────────────────────────
const get2FAStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('twoFactor');
        res.json({ enabled: user?.twoFactor?.enabled || false });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server' });
    }
};

module.exports = { setup2FA, verify2FA, disable2FA, get2FAStatus };
