const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authRoutes = require('../../src/routes/authRoutes');
const redis = require('../../src/utils/redis');
const { sendResetEmail } = require('../../src/utils/email');

const app = express();
app.use(express.json());
app.use('/api', authRoutes);

const prisma = new PrismaClient();

// Mock Redis and Nodemailer
jest.mock('../../src/utils/redis', () => ({
  get: jest.fn().mockResolvedValue(null),
  setEx: jest.fn().mockResolvedValue(),
  incr: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(),
  multi: jest.fn(() => ({
    incr: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(),
  })),
}));
jest.mock('../../src/utils/email', () => ({
  sendResetEmail: jest.fn().mockResolvedValue(),
}));

describe('API Endpoints', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await prisma.referral.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({ email: 'test@example.com', username: 'testuser', password: 'password123' });
      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
    });

    it('should fail with invalid email', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({ email: 'invalid', username: 'testuser', password: 'password123' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid email format');
    });

    it('should fail with duplicate email', async () => {
      await prisma.user.create({
        data: { email: 'test@example.com', username: 'user1', passwordHash: 'hashed' },
      });
      const res = await request(app)
        .post('/api/register')
        .send({ email: 'test@example.com', username: 'testuser', password: 'password123' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Email or username already in use');
    });

    it('should fail with duplicate username', async () => {
      await prisma.user.create({
        data: { email: 'user1@example.com', username: 'testuser', passwordHash: 'hashed' },
      });
      const res = await request(app)
        .post('/api/register')
        .send({ email: 'test@example.com', username: 'testuser', password: 'password123' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Email or username already in use');
    });

    it('should fail with short password', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({ email: 'test@example.com', username: 'testuser', password: 'short' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Password must be at least 8 characters');
    });

    it('should fail with missing fields', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({ email: 'test@example.com', username: 'testuser' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('All fields are required');
    });

    it('should handle valid referral code', async () => {
      const referrer = await prisma.user.create({
        data: {
          email: 'ref@example.com',
          username: 'referrer',
          passwordHash: 'hashed',
          referralCode: 'ref123',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        },
      });
      const res = await request(app)
        .post('/api/register')
        .send({ email: 'test@example.com', username: 'testuser', password: 'password123', referralCode: 'ref123' });
      expect(res.status).toBe(201);
      const referral = await prisma.referral.findFirst({ where: { referrerId: referrer.id } });
      expect(referral).toBeDefined();
      expect(referral.status).toBe('successful');
    });

    it('should prevent self-referral', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'self@example.com',
          username: 'selfuser',
          passwordHash: 'hashed',
          referralCode: 'self123',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        },
      });
      const res = await request(app)
        .post('/api/register')
        .send({ email: 'test@example.com', username: 'testuser', password: 'password123', referralCode: 'self123' });
      expect(res.status).toBe(201);
      const newUser = await prisma.user.findUnique({ where: { email: 'test@example.com' } });
      expect(newUser.referredBy).toBe(user.id);
    });

    it('should fail with invalid referral code', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({ email: 'test@example.com', username: 'testuser', password: 'password123', referralCode: 'invalidcode' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid referral code');
    });

    it('should fail with expired referral code', async () => {
      await prisma.user.create({
        data: {
          email: 'ref@example.com',
          username: 'referrer',
          passwordHash: 'hashed',
          referralCode: 'expired123',
          expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        },
      });
      const res = await request(app)
        .post('/api/register')
        .send({ email: 'test@example.com', username: 'testuser', password: 'password123', referralCode: 'expired123' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Referral code has expired');
    });
  });

  describe('POST /api/login', () => {
    it('should login successfully with email', async () => {
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          username: 'testuser',
          passwordHash: await require('bcrypt').hash('password123', 10),
        },
      });
      const res = await request(app)
        .post('/api/login')
        .send({ emailOrUsername: 'test@example.com', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it('should login successfully with username', async () => {
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          username: 'testuser',
          passwordHash: await require('bcrypt').hash('password123', 10),
        },
      });
      const res = await request(app)
        .post('/api/login')
        .send({ emailOrUsername: 'testuser', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it('should fail with wrong password', async () => {
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          username: 'testuser',
          passwordHash: await require('bcrypt').hash('password123', 10),
        },
      });
      const res = await request(app)
        .post('/api/login')
        .send({ emailOrUsername: 'testuser', password: 'wrongpass' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should fail with non-existent user', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({ emailOrUsername: 'nonexistent', password: 'password123' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });
  });

  describe('GET /api/referrals', () => {
    it('should fetch referrals for authenticated user', async () => {
      const referrer = await prisma.user.create({
        data: { email: 'ref@example.com', username: 'referrer', passwordHash: 'hashed' },
      });
      const referredUser = await prisma.user.create({
        data: { email: 'referred@example.com', username: 'referreduser', passwordHash: 'hashed' },
      });
      await prisma.referral.create({
        data: { 
          referrerId: referrer.id, 
          referredUserId: referredUser.id, 
          status: 'successful',
        },
      });
      const token = require('jsonwebtoken').sign({ id: referrer.id }, process.env.JWT_SECRET);

      const res = await request(app)
        .get('/api/referrals')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].referredUser.username).toBe('referreduser');
    });

    it('should fail without token', async () => {
      const res = await request(app).get('/api/referrals');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('No token provided');
    });

    it('should fail with invalid token', async () => {
      const res = await request(app)
        .get('/api/referrals')
        .set('Authorization', 'Bearer invalidtoken');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid token');
    });
  });

  describe('GET /api/referral-stats', () => {
    it('should return referral stats', async () => {
      const referrer = await prisma.user.create({
        data: { email: 'ref@example.com', username: 'referrer', passwordHash: 'hashed' },
      });
      const referredUser1 = await prisma.user.create({
        data: { email: 'referred1@example.com', username: 'referred1', passwordHash: 'hashed' },
      });
      const referredUser2 = await prisma.user.create({
        data: { email: 'referred2@example.com', username: 'referred2', passwordHash: 'hashed' },
      });
      await prisma.referral.create({
        data: { 
          referrerId: referrer.id, 
          referredUserId: referredUser1.id, 
          status: 'successful',
        },
      });
      await prisma.referral.create({
        data: { 
          referrerId: referrer.id, 
          referredUserId: referredUser2.id, 
          status: 'successful',
        },
      });
      const token = require('jsonwebtoken').sign({ id: referrer.id }, process.env.JWT_SECRET);

      const res = await request(app)
        .get('/api/referral-stats')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.successfulReferrals).toBe(2);
    });

    it('should return zero for no referrals', async () => {
      const referrer = await prisma.user.create({
        data: { email: 'ref@example.com', username: 'referrer', passwordHash: 'hashed' },
      });
      const token = require('jsonwebtoken').sign({ id: referrer.id }, process.env.JWT_SECRET);

      const res = await request(app)
        .get('/api/referral-stats')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.successfulReferrals).toBe(0);
    });

    it('should fail without token', async () => {
      const res = await request(app).get('/api/referral-stats');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('No token provided');
    });
  });
});