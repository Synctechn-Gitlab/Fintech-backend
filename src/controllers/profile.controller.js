const { UserPreference, Payment } = require('../models');
const { BadRequestError } = require('../utils/errors');
const bcrypt = require('bcryptjs');

const getProfile = async (req, res, next) => {
  try {
    const user = req.user;

    // Fetch stats
    const totalPayments = await Payment.findAll({ where: { userId: user.id, status: 'Paid' } });
    const totalPaid = totalPayments.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        customerId: user.customerId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        phoneMasked: user.phone.replace(/(\+\d{2} \d{2})\d{3} \d{2}(\d{3})/, '$1••• ••$2'),
        kycStatus: user.kycStatus,
        creditScore: user.creditScore,
        activeLoansCount: user.activeLoans || 1,
        onTimeRate: user.onTimeRate || 100,
        totalPaid,
        preferences: {
          darkMode: user.preferences?.darkMode ?? true,
          notifications: user.preferences?.notifications ?? true,
          loginAlerts: user.preferences?.loginAlerts ?? true,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const user = req.user;
    const { name, email } = req.body;

    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updatePreferences = async (req, res, next) => {
  try {
    const user = req.user;
    const { darkMode, notifications, loginAlerts } = req.body;

    let prefs = await UserPreference.findOne({ where: { userId: user.id } });
    if (!prefs) {
      prefs = await UserPreference.create({ userId: user.id });
    }

    if (darkMode !== undefined) prefs.darkMode = darkMode;
    if (notifications !== undefined) prefs.notifications = notifications;
    if (loginAlerts !== undefined) prefs.loginAlerts = loginAlerts;

    await prefs.save();

    res.status(200).json({
      success: true,
      preferences: {
        darkMode: prefs.darkMode,
        notifications: prefs.notifications,
        loginAlerts: prefs.loginAlerts,
      },
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const user = req.user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new BadRequestError('Current password and new password are required');
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new BadRequestError('Incorrect current password');
    }

    user.passwordHash = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updatePreferences,
  changePassword,
};
