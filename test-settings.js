require('dotenv').config();
const { SystemSetting } = require('./src/models');
const { Op } = require('sequelize');

async function testFindAll() {
  try {
    const settings = await SystemSetting.findAll({
      where: { key: ['annual_interest_rate', 'penalty_charge'] }
    });
    console.log("Success:", settings.length);
  } catch (err) {
    console.error("Error with implicit IN array:", err);
  }
}

testFindAll();
