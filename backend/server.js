const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const app = express();

// Middleware
app.use(cors());
// app.use(express.json());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));

// Phục vụ file tĩnh từ thư mục uploads
const UPLOAD_DIR = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(UPLOAD_DIR));

// Routes
const memberRoutes = require('./routes/memberRoutes');
app.use('/api/members', memberRoutes);
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);
const suggestionRoutes = require('./routes/suggestionRoutes');
app.use('/api/suggestions', suggestionRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((error) => {
    console.error('Error connecting to MongoDB:', error);
});

// Routes
app.get('/', (req, res) => {
    res.send('Server is running!');
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
