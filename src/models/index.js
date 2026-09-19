const sequelize = require('../config/database');
const User = require('./User');
const UserPreference = require('./UserPreference');
const Loan = require('./Loan');
const Payment = require('./Payment');
const SystemSetting = require('./SystemSetting');
const EmailVerificationOtp = require('./EmailVerificationOtp');

// Associations
User.hasOne(UserPreference, { foreignKey: 'userId', as: 'preferences', onDelete: 'CASCADE' });
UserPreference.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(EmailVerificationOtp, { foreignKey: 'userId', as: 'verificationOtps', onDelete: 'CASCADE' });
EmailVerificationOtp.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Loan, { foreignKey: 'userId', as: 'loans', onDelete: 'CASCADE' });
Loan.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Payment, { foreignKey: 'userId', as: 'payments', onDelete: 'CASCADE' });
Payment.belongsTo(User, { foreignKey: 'userId' });

Loan.hasMany(Payment, { foreignKey: 'loanId', as: 'payments', onDelete: 'CASCADE' });
Payment.belongsTo(Loan, { foreignKey: 'loanId' });

module.exports = {
  sequelize,
  User,
  UserPreference,
  Loan,
  Payment,
  SystemSetting,
  EmailVerificationOtp,
};
