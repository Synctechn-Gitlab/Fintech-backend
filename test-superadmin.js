const auth = require('./src/middleware/auth.middleware');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function testSuperAdminProtect() {
  const token = jwt.sign(
    { id: 'super-admin', email: 'superadmin@hidelfinance.com', role: 'superadmin' },
    process.env.JWT_SECRET || 'supersecretjwtkeyfornovafinance123',
    { expiresIn: '15m' }
  );
  
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = {};
  const next = (err) => {
    if (err) console.error("Error from protect:", err);
    else console.log("Protect succeeded! User:", req.user);
  };
  
  await auth.protect(req, res, next);
}

testSuperAdminProtect();
