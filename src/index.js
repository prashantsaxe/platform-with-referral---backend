const express = require('express');
const authRoutes = require('./routes/authRoutes');
const rateLimitMiddleware = require('./middleware/rateLimitMiddleware');

const app = express();
app.use(express.json());

// Apply Redis-based rate limiting to all /api routes
app.use('/api', rateLimitMiddleware);

// Routes
app.use('/api', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));