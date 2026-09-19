require('dotenv').config();
const { Loan, Payment, SystemSetting, sequelize } = require('./src/models');
const loanService = require('./src/services/loan.service');
const paymentService = require('./src/services/payment.service');

async function testLateDue() {
  try {
    const loan = await Loan.findOne();
    if (!loan) {
      console.log('No loan found');
      return;
    }

    console.log("Setting penalty settings...");
    await SystemSetting.upsert({ key: 'late_due_fee', value: '100' });

    console.log("Forcing loan to be overdue...");
    await loan.update({ 
      nextDueDate: '2026-09-15',
      outstanding: 700,
      nextDueAmount: 200,
      termMonths: 10,
      lastPenaltyDate: null,
      lateDueInterestRate: 3
    });

    console.log("Getting active loan details...");
    const active = await loanService.getActiveLoanByUserId(loan.userId);
    console.log("Active Loan Outstanding:", active.outstanding, "Penalty Breakdown:", active.breakdown.penalty);

    console.log("Getting late-due API details...");
    const lateDue = await loanService.getOverdueDetails(loan.id, loan.userId);
    console.log("Late Due API Payload:", lateDue);

    console.log("Processing a partial payment of 50...");
    const result = await paymentService.processRepayment(loan.userId, 50, 'Bank', 'custom');
    console.log("Process Result:", result);

    const updatedLoan = await Loan.findByPk(loan.id);
    console.log("Updated Loan Historical Fields:");
    console.log({
      lateDueInterestRate: updatedLoan.lateDueInterestRate,
      lateDueInterest: updatedLoan.lateDueInterest,
      lateDueFee: updatedLoan.lateDueFee,
      totalLateDueAmount: updatedLoan.totalLateDueAmount,
      daysOverdue: updatedLoan.daysOverdue,
      lateDueAppliedAt: updatedLoan.lateDueAppliedAt
    });

    // Clean up test data modification if needed
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

testLateDue();
