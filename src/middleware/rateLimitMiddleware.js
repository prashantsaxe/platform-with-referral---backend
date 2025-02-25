const redis = require('../utils/redis');

const rateLimitMiddleware = async (req, res, next) => {
  const ip = req.ip; // Use IP as identifier (could use user ID if authenticated)
  const key = `rate-limit:${ip}`;
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100;

  try {
    const requests = await redis.get(key) || 0;
    if (parseInt(requests) >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    await redis.multi()
      .incr(key)
      .expire(key, windowMs / 1000) // Expire after window in seconds
      .exec();

    next();
  } catch (error) {
    console.error('Rate Limit Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = rateLimitMiddleware;