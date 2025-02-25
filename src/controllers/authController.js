const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { sendResetEmail } = require('../utils/email');

const prisma = new PrismaClient();

const register = async (req, res) => {
  const { email, username, password, referralCode } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Email or username already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Referral code expires in 30 days

    const user = await prisma.user.create({
      data: { email, username, passwordHash, expiresAt },
    });

    if (referralCode) {
      const referrer = await prisma.user.findUnique({ 
        where: { referralCode },
        select: { id: true, referralCode: true, expiresAt: true },
      });
      if (!referrer) {
        return res.status(400).json({ error: 'Invalid referral code' });
      }
      if (referrer.id === user.id || referralCode === user.referralCode) {
        return res.status(400).json({ error: 'Cannot use your own referral code' });
      }
      if (referrer.expiresAt && new Date() > referrer.expiresAt) {
        return res.status(400).json({ error: 'Referral code has expired' });
      }

      await prisma.referral.create({
        data: {
          referrerId: referrer.id,
          referredUserId: user.id,
          status: 'successful',
        },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { referredBy: referrer.id },
      });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const login = async (req, res) => {
  const { emailOrUsername, password } = req.body;

  try {
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: emailOrUsername }, { username: emailOrUsername }] },
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    await sendResetEmail(email, resetToken);

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { register, login, forgotPassword };