const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { User, UserPreference, EmailVerificationOtp } = require('../models');
const { sendVerificationEmail } = require('../utils/emailService');
const { UnauthorizedError, NotFoundError, BadRequestError } = require('../utils/errors');

const SUPER_ADMIN = {
  id: 'super-admin',
  name: 'Super Admin',
  email: process.env.SUPERADMIN_EMAIL || 'superadmin@hidelfinance.com',
  password: process.env.SUPERADMIN_PASSWORD || 'superadmin123',
  role: 'superadmin',
};

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role || 'user' },
    process.env.JWT_SECRET || 'supersecretjwtkeyfornovafinance123',
    { expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET || 'anothersecretrefreshkeyfornovafinance456',
    { expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d' }
  );
};

const login = async (email, password) => {
  const normalizedEmail = email.trim().toLowerCase();

  if (
    normalizedEmail === SUPER_ADMIN.email.toLowerCase() &&
    password === SUPER_ADMIN.password
  ) {
    const accessToken = generateAccessToken(SUPER_ADMIN);
    const refreshToken = generateRefreshToken(SUPER_ADMIN);

    return {
      user: {
        id: SUPER_ADMIN.id,
        name: SUPER_ADMIN.name,
        email: SUPER_ADMIN.email,
        role: SUPER_ADMIN.role,
      },
      accessToken,
      refreshToken,
    };
  }

  const user = await User.findOne({
    where: {
      [Op.or]: [
        { email: normalizedEmail },
        { customerId: email.trim() }
      ]
    },
    include: [{ model: UserPreference, as: 'preferences' }],
  });

  if (!user || !(await user.comparePassword(password))) {
    throw new UnauthorizedError('Incorrect email/customer ID or password');
  }

  if (!user.isVerified) {
    throw new UnauthorizedError('Please verify your email address before logging in.');
  }



  if (user.status === 'Rejected') {
    throw new UnauthorizedError(`Account has been rejected. Please contact support.`);
  }

  if (user.status === 'Paused' || user.status === 'Suspended') {
    throw new UnauthorizedError(`Account is ${user.status.toLowerCase()}. Please contact support.`);
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    user: {
      id: user.id,
      name: user.name,
      customerId: user.customerId,
      email: user.email,
      role: user.role ? user.role.toLowerCase() : 'user',
      phoneMasked: user.phone.replace(/(\+\d{2} \d{2})\d{3} \d{2}(\d{3})/, '$1••• ••$2'),
      kycStatus: user.kycStatus,
      creditScore: user.creditScore,
      preferences: user.preferences,
    },
    accessToken,
    refreshToken,
  };
};

const signup = async (userData) => {
  const { name, email, phone, password } = userData;
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({ where: { email: normalizedEmail } });
  if (existingUser) {
    if (existingUser.isVerified) {
      throw new BadRequestError('Email address is already in use');
    }
    // If not verified, user might be retrying signup (e.g. after a failed email send)
    // We clean up the old unverified record to let them try again.
    await User.destroy({ where: { id: existingUser.id } });
  }

  // Generate a temporary Customer ID
  const customerId = `PENDING-${Math.floor(100000 + Math.random() * 900000)}`;

  const newUser = await User.create({
    name,
    email: normalizedEmail,
    phone,
    passwordHash: password,
    customerId,
    status: 'Pending',
    isVerified: false,
  });

  // Create default preferences
  await UserPreference.create({
    userId: newUser.id,
    darkMode: true,
    notifications: true,
    loginAlerts: true,
  });

  // Generate 6-digit OTP securely
  const otp = crypto.randomInt(100000, 1000000).toString();
  
  // Hash the OTP
  const salt = await require('bcryptjs').genSalt(10);
  const otpHash = await require('bcryptjs').hash(otp, salt);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await EmailVerificationOtp.create({
    userId: newUser.id,
    otpHash,
    expiresAt,
  });

  // Send the verification email with the plain OTP
  try {
    await sendVerificationEmail(normalizedEmail, newUser.name, otp);
  } catch (error) {
    // If email fails to send, destroy the created user so they can retry
    await User.destroy({ where: { id: newUser.id } });
    throw new BadRequestError(error.message || 'Unable to send verification email. Please try again.');
  }

  return {
    message: 'User created successfully. Please check your email to verify your account.',
  };
};

const refreshAccessToken = async (token) => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || 'anothersecretrefreshkeyfornovafinance456'
    );

    if (decoded.id === SUPER_ADMIN.id) {
      return generateAccessToken(SUPER_ADMIN);
    }

    const user = await User.findByPk(decoded.id);

    if (!user) {
      throw new UnauthorizedError('User does not exist');
    }

    if (['Paused', 'Suspended', 'Pending', 'Rejected'].includes(user.status)) {
      throw new UnauthorizedError(`Account is ${user.status.toLowerCase()}`);
    }

    const newAccessToken = generateAccessToken(user);
    return newAccessToken;
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
};

// In-memory OTP cache for demo purposes. Maps email -> otp
const otpCache = new Map();

const forgotPassword = async (email) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({
    where: {
      [Op.or]: [
        { email: normalizedEmail },
        { customerId: email.trim() }
      ]
    }
  });
  if (!user) {
    throw new NotFoundError('No account with that email address or customer ID exists');
  }

  // Generate a random 6-digit OTP
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store it in memory for 10 minutes
  otpCache.set(user.email, generatedOtp);
  setTimeout(() => otpCache.delete(user.email), 10 * 60 * 1000);

  // Simulate sending to both Email and Mobile
  console.log('\n=============================================');
  console.log(`[OTP SERVICE] Sending OTP ${generatedOtp} via SMS to ${user.phone}`);
  console.log(`[OTP SERVICE] Sending OTP ${generatedOtp} via Email to ${user.email}`);
  console.log('=============================================\n');

  return true;
};

const resetPassword = async (email, otp, newPassword) => {
  if (!otp || otp.length !== 6) {
    throw new BadRequestError('Invalid OTP code format');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({
    where: {
      [Op.or]: [
        { email: normalizedEmail },
        { customerId: email.trim() }
      ]
    }
  });
  
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const validOtp = otpCache.get(user.email);
  if (!validOtp || validOtp !== otp) {
    throw new BadRequestError('Invalid or expired OTP code');
  }

  user.passwordHash = newPassword;
  user.plainPassword = newPassword; // For demo purposes, keep plain password so admin can see it masked
  await user.save();
  
  // Clear the OTP after successful use
  otpCache.delete(user.email);
  
  return true;
};

const verifyEmail = async (email, otp) => {
  if (!email || !otp) {
    throw new BadRequestError('Email and OTP are required');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ where: { email: normalizedEmail } });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.isVerified) {
    throw new BadRequestError('Email is already verified');
  }

  const otpRecord = await EmailVerificationOtp.findOne({
    where: { userId: user.id, verified: false },
    order: [['createdAt', 'DESC']],
  });

  if (!otpRecord) {
    throw new BadRequestError('No pending verification request found');
  }

  if (otpRecord.attempts >= 5) {
    throw new BadRequestError('Maximum verification attempts exceeded. Please request a new OTP.');
  }

  if (otpRecord.expiresAt < new Date()) {
    throw new BadRequestError('Verification OTP has expired. Please request a new one.');
  }

  const isValid = await require('bcryptjs').compare(otp, otpRecord.otpHash);

  if (!isValid) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    throw new BadRequestError('Invalid OTP');
  }

  // Success
  otpRecord.verified = true;
  await otpRecord.save();

  user.isVerified = true;
  user.status = 'Active'; // Automatically approve user upon email verification
  await user.save();

  return true;
};

const resendVerificationOtp = async (email) => {
  if (!email) {
    throw new BadRequestError('Email is required');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ where: { email: normalizedEmail } });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.isVerified) {
    throw new BadRequestError('Email is already verified');
  }

  // Expire all previous OTPs
  await EmailVerificationOtp.update(
    { expiresAt: new Date() },
    { where: { userId: user.id, verified: false } }
  );

  // Generate 6-digit OTP securely
  const otp = crypto.randomInt(100000, 1000000).toString();
  
  // Hash the OTP
  const salt = await require('bcryptjs').genSalt(10);
  const otpHash = await require('bcryptjs').hash(otp, salt);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await EmailVerificationOtp.create({
    userId: user.id,
    otpHash,
    expiresAt,
  });

  // Send the verification email with the plain OTP
  await sendVerificationEmail(normalizedEmail, user.name, otp);

  return true;
};

module.exports = {
  login,
  signup,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationOtp,
};
