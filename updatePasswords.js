require('dotenv').config();
const sequelize = require('./src/config/database');
const User = require('./src/models/User');
const bcrypt = require('bcryptjs');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Connected.');
    
    // Alter table to add column if not exists
    await User.sync({ alter: true });
    console.log('User table synced.');

    const users = await User.findAll();
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);

    for (const user of users) {
      user.plainPassword = 'password123';
      user.passwordHash = hash;
      await user.save({ hooks: false }); // disable hooks to avoid re-hashing
    }

    console.log('All existing users updated to password123');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
