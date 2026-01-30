//backend\middlewares\authMiddleware.js

const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.log("🚨 Không tìm thấy token hoặc token không hợp lệ!");
        return res.status(401).json({ message: "Không có token, truy cập bị từ chối!" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select("-password"); // Lấy thông tin user từ token

        if (!req.user) {
            return res.status(401).json({ message: "Người dùng không hợp lệ!" });
        }

        next();
    } catch (error) {
        console.error("Lỗi xác thực token:", error);
        res.status(401).json({ message: "Token không hợp lệ!" });
    }
};

module.exports = authMiddleware;
