require('dotenv').config();
const { User, Loan, Payment } = require('./src/models');
async function run() {
  const users = await User.findAll({
    include: [
      { model: Loan, as: 'loans', separate: true, order: [['createdAt', 'DESC']] },
      { model: Payment, as: 'payments' }
    ],
    order: [['createdAt', 'DESC']]
  });

  const formattedUsers = users.map(user => {
    const userObj = user.toJSON();
    const loans = userObj.loans || [];
    const payments = userObj.payments || [];
    
    const transactions = payments.map(p => {
      const loanForTx = loans.find(l => l.id === p.loanId);
      const expectedEmi = loanForTx ? parseFloat(loanForTx.nextDueAmount) : 0;
      const isPartial = expectedEmi > 0 && parseFloat(p.amount) < expectedEmi;
      
      return {
        transactionId: p.transactionReference,
        type: isPartial ? 'Partial Payment' : 'EMI Payment',
        amount: p.amount,
        expectedEmi: expectedEmi,
        isPartial: isPartial
      };
    });
    
    return {
      customerId: userObj.customerId,
      transactions
    };
  });
  
  console.log(JSON.stringify(formattedUsers, null, 2));
}

run().catch(console.error).finally(() => process.exit());
