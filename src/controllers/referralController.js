const { PrismaClient } = require('@prisma/client');
const redis = require('../utils/redis');

const prisma = new PrismaClient();

const getReferrals = async (req, res) => {
  const userId = req.user.id;
  const cacheKey = `referrals:${userId}`;

  try {
    // Check cache first
    const cachedReferrals = await redis.get(cacheKey);
    if (cachedReferrals) {
      return res.json(JSON.parse(cachedReferrals));
    }

    // Fetch from database if not in cache
    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      include: { referredUser: { select: { username: true, email: true } } },
    });

    // Cache the result for 5 minutes
    await redis.setEx(cacheKey, 300, JSON.stringify(referrals));
    res.json(referrals);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getReferralStats = async (req, res) => {
  const userId = req.user.id;
  const cacheKey = `referral-stats:${userId}`;

  try {
    // Check cache first
    const cachedStats = await redis.get(cacheKey);
    if (cachedStats) {
      return res.json(JSON.parse(cachedStats));
    }

    // Fetch from database if not in cache
    const stats = await prisma.referral.aggregate({
      where: { referrerId: userId, status: 'successful' },
      _count: { id: true },
    });

    const result = { successfulReferrals: stats._count.id };
    // Cache the result for 5 minutes
    await redis.setEx(cacheKey, 300, JSON.stringify(result));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getReferrals, getReferralStats };