const { sequelize, User, UserPreference, Loan, Payment, SystemSetting } = require('../models');
const logger = require('./logger');

const seedDatabase = async () => {
  try {
    // Sync database with alter: true to safely add new columns
    await sequelize.sync({ alter: true });

    const userCount = await User.count();
    if (userCount > 0) {
      logger.info('Database already synced. Skipping seeding.');
      return;
    }

    logger.info('Database empty. Seeding initial data matching frontend mockup...');

    // 1. Create Default User
    const user = await User.create({
      name: 'Aarav Shah',
      customerId: 'NV-48211',
      email: 'aarav.shah@example.com',
      passwordHash: 'password123', // Will be hashed automatically by User model hook
      phone: '+91 98765 43421',
      kycStatus: 'verified',
      creditScore: 782,
    });

    // 2. Create User Preferences
    await UserPreference.create({
      userId: user.id,
      darkMode: true,
      notifications: true,
      loginAlerts: true,
    });

    // 3. Create Default Loan
    const loan = await Loan.create({
      loanReference: 'LN-48211',
      userId: user.id,
      type: 'Personal Loan',
      principal: 48000.00,
      outstanding: 22320.00,
      paid: 25680.00,
      interestRate: 8.4,
      termMonths: 36,
      paidEmis: 9,
      nextDueAmount: 1240.00,
      nextDueDate: '2026-06-05',
      paymentMethod: 'HDFC Bank ••4421',
      principalBreakdown: 980.00,
      interestBreakdown: 210.00,
      feesBreakdown: 50.00,
    });

    // 4. Create Initial Payment History
    const INITIAL_PAYMENTS = [
      { transactionReference: 'TX-009', emiNo: '009', date: '2026-05-05', method: 'Auto-debit · HDFC ••4421', amount: 1240, status: 'Paid' },
      { transactionReference: 'TX-008', emiNo: '008', date: '2026-04-05', method: 'Auto-debit · HDFC ••4421', amount: 1240, status: 'Paid' },
      { transactionReference: 'TX-007', emiNo: '007', date: '2026-03-05', method: 'Auto-debit · HDFC ••4421', amount: 1240, status: 'Paid' },
      { transactionReference: 'TX-006', emiNo: '006', date: '2026-02-05', method: 'Auto-debit · HDFC ••4421', amount: 1240, status: 'Paid' },
      { transactionReference: 'TX-005', emiNo: '005', date: '2026-01-05', method: 'Auto-debit · HDFC ••4421', amount: 1240, status: 'Paid' },
      { transactionReference: 'TX-004', emiNo: '004', date: '2025-12-05', method: 'Auto-debit · HDFC ••4421', amount: 1240, status: 'Paid' },
      { transactionReference: 'TX-003', emiNo: '003', date: '2025-11-05', method: 'Auto-debit · HDFC ••4421', amount: 1240, status: 'Paid' },
      { transactionReference: 'TX-002', emiNo: '002', date: '2025-10-05', method: 'Auto-debit · HDFC ••4421', amount: 1240, status: 'Paid' },
      { transactionReference: 'TX-001', emiNo: '001', date: '2025-09-05', method: 'Auto-debit · HDFC ••4421', amount: 1240, status: 'Paid' },
    ];

    for (const p of INITIAL_PAYMENTS) {
      await Payment.create({
        ...p,
        userId: user.id,
        loanId: loan.id,
      });
    }

    // 5. Initialize System Settings
    await SystemSetting.create({
      key: 'penalty_charge',
      value: '0'
    });

    logger.info('Database successfully seeded!');
  } catch (error) {
    logger.error('Error seeding database: ', error);
  }
};

module.exports = {
  seedDatabase,
};
