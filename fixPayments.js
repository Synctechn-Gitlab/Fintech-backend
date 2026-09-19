require('dotenv').config();
const { User, Loan, Payment, sequelize } = require('./src/models');

const fixPayments = async () => {
  try {
    const user = await User.findOne({ where: { name: 'Leo' } }) || await User.findOne({ where: { name: 'Leo Das' } });
    
    if (!user) {
      console.log('User not found. They might have a different name.');
      process.exit(0);
    }
    
    const loan = await Loan.findOne({ where: { userId: user.id } });
    if (!loan) {
      console.log('Loan not found.');
      process.exit(0);
    }

    const currentPayments = await Payment.count({ where: { loanId: loan.id } });
    if (currentPayments >= 5) {
      console.log('Payments already exist.');
      process.exit(0);
    }

    console.log(`Adding ${5 - currentPayments} payments for user ${user.name}...`);

    for (let i = currentPayments + 1; i <= 5; i++) {
      const emiNo = String(i).padStart(3, '0');
      const uniqueTxRef = `TX-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`;
      await Payment.create({
        transactionReference: uniqueTxRef,
        userId: user.id,
        loanId: loan.id,
        emiNo,
        amount: 60,
        date: new Date().toISOString().split('T')[0],
        method: 'HDFC Bank ••4421',
        status: 'Paid',
      });
    }
    
    console.log('Done fixing payments!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

fixPayments();
