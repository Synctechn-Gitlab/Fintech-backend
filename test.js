const { Loan, Payment, SystemSetting, User } = require('./src/models');
const loanService = require('./src/services/loan.service');

async function runTest() {
  console.log('Testing Overdue Logic...');
  try {
    const loan = await Loan.findOne();
    if (!loan) {
      console.log('No loan found in DB to test.');
      return;
    }
    
    // Test getOverdueDetails
    console.log('Loan found:', loan.loanReference, 'Outstanding:', loan.outstanding);
    
    const details = await loanService.getOverdueDetails(loan.id, loan.userId);
    console.log('Overdue details:', details);
    
    console.log('Test successful');
  } catch (err) {
    console.error('Test failed:', err);
  }
}

runTest().then(() => process.exit(0));
