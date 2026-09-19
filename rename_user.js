const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false
});

const User = sequelize.define('User', {
  email: { type: DataTypes.STRING }
});

async function run() {
  try {
    await sequelize.authenticate();
    
    // Instead of deleting (which fails due to Foreign Keys), we just RENAME the email
    // This frees up 'hashwanthprabhakaran08@gmail.com' for a fresh registration!
    const [updatedRows] = await User.update(
      { email: 'hashwanthprabhakaran08_OLD@gmail.com' },
      { where: { email: 'hashwanthprabhakaran08@gmail.com' } }
    );
    
    console.log(`Successfully renamed ${updatedRows} user(s).`);
    console.log('You can now register with hashwanthprabhakaran08@gmail.com again!');
  } catch (error) {
    console.error('Error updating user:', error);
  } finally {
    process.exit(0);
  }
}

run();
