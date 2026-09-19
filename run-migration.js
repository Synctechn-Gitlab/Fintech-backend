require('dotenv').config();
const { sequelize } = require('./src/models');
const migration = require('./migrations/20260918-add-late-due-fields-to-loans.js');
const Sequelize = require('sequelize');

async function runMigration() {
  try {
    const queryInterface = sequelize.getQueryInterface();
    await migration.up(queryInterface, Sequelize);
    console.log("Migration successful");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  }
}

runMigration();
