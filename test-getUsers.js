const { User, Loan, Payment, SystemSetting } = require('./src/models');
const adminController = require('./src/controllers/admin.controller');

async function testGetUsers() {
  const req = {};
  const res = {
    status: (code) => {
      console.log('Status:', code);
      return {
        json: (data) => console.log('JSON:', JSON.stringify(data).substring(0, 100))
      };
    }
  };
  const next = (err) => {
    console.error('Error passed to next():', err);
  };
  
  await adminController.getUsers(req, res, next);
}

testGetUsers();
