const { PrismaClient } = require('@prisma/client');
const redis = require('../../src/utils/redis');
const { getReferrals, getReferralStats } = require('../../src/controllers/referralController');

jest.mock('@prisma/client', () => {
  const mPrisma = {
    referral: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mPrisma) };
});

jest.mock('../../src/utils/redis', () => ({
  get: jest.fn(),
  setEx: jest.fn(),
}));

const prisma = new PrismaClient();

describe('Referral System Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getReferrals', () => {
    it('should return cached referrals if available', async () => {
      const req = { user: { id: 'user1' } };
      const res = { json: jest.fn() };
      redis.get.mockResolvedValue(JSON.stringify([{ id: 'ref1' }]));

      await getReferrals(req, res);
      expect(res.json).toHaveBeenCalledWith([{ id: 'ref1' }]);
      expect(prisma.referral.findMany).not.toHaveBeenCalled();
    });

    it('should fetch and cache referrals if not in cache', async () => {
      const req = { user: { id: 'user1' } };
      const res = { json: jest.fn() };
      redis.get.mockResolvedValue(null);
      prisma.referral.findMany.mockResolvedValue([{ id: 'ref1' }]);

      await getReferrals(req, res);
      expect(res.json).toHaveBeenCalledWith([{ id: 'ref1' }]);
      expect(redis.setEx).toHaveBeenCalledWith('referrals:user1', 300, JSON.stringify([{ id: 'ref1' }]));
    });
  });

  describe('getReferralStats', () => {
    it('should handle invalid referral code (no self-referral)', async () => {
      const req = { user: { id: 'user1' } };
      const res = { json: jest.fn() };
      redis.get.mockResolvedValue(null);
      prisma.referral.aggregate.mockResolvedValue({ _count: { id: 2 } });

      await getReferralStats(req, res);
      expect(res.json).toHaveBeenCalledWith({ successfulReferrals: 2 });
    });

    it('should return zero for no referrals', async () => {
      const req = { user: { id: 'user1' } };
      const res = { json: jest.fn() };
      redis.get.mockResolvedValue(null);
      prisma.referral.aggregate.mockResolvedValue({ _count: { id: 0 } });

      await getReferralStats(req, res);
      expect(res.json).toHaveBeenCalledWith({ successfulReferrals: 0 });
    });
  });
});