require('dotenv').config();
const { Payment } = require('./src/models');
async function run() {
  await Payment.update({ paymentType: 'emi' }, { where: { transactionReference: 'TX-067152121' } });
  await Payment.update({ paymentType: 'custom' }, { where: { transactionReference: 'TX-118855105' } });
  console.log('Successfully updated the test transactions.');
}
run().catch(console.error).finally(() => process.exit());
