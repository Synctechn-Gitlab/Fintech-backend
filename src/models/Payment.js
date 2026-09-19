const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  transactionReference: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  loanId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  emiNo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  method: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  paymentType: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'User chosen payment option: emi, custom, or full',
  },
  status: {
    type: DataTypes.ENUM('Paid', 'Pending', 'Failed'),
    defaultValue: 'Pending',
  },
});

module.exports = Payment;
