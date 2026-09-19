const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserPreference = sequelize.define('UserPreference', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  darkMode: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  notifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  loginAlerts: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

module.exports = UserPreference;
