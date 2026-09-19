require('dotenv').config();
const { Payment } = require('./src/models');
async function run() {
  const p1 = await Payment.findOne({ where: { transactionReference: 'TX-067152121' } });
  const p2 = await Payment.findOne({ where: { transactionReference: 'TX-118855105' } });
  
  console.log('TX-067152121:', p1 ? p1.paymentType : 'not found');
  console.log('TX-118855105:', p2 ? p2.paymentType : 'not found');
}
run().catch(console.error).finally(() => process.exit());
