const { User, Loan, Payment } = require('./src/models');
async function run() {
  const users = await User.findAll();
  const loans = await Loan.findAll();
  const payments = await Payment.findAll();

  const formattedUsers = users.map(user => {
    const userObj = user.toJSON();
    const userLoans = loans.filter(l => l.userId === userObj.id);
    const userPayments = payments.filter(p => p.userId === userObj.id);
    
    const transactions = userPayments.map(p => {
      const loanForTx = userLoans.find(l => l.id === p.loanId);
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
