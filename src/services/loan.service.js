const { Loan, Payment, SystemSetting } = require('../models');
const { NotFoundError } = require('../utils/errors');

const getActiveLoanByUserId = async (userId) => {
  const loan = await Loan.findOne({
    where: { userId },
  });

  if (!loan) {
    return null;
  }

  // Dynamically calculate paid amounts and EMIs from the Payment table
  const payments = await Payment.findAll({
    where: { loanId: loan.id, status: 'Paid' },
  });

  const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const calculatedPaidEmis = payments.length;
  const expectedTotalAmount = parseFloat(loan.nextDueAmount) * loan.termMonths;
  const calculatedOutstanding = parseFloat(loan.outstanding);

  const mappedTransactions = payments.map((p, idx) => ({
    id: p.transactionReference || `TX-${String(idx+1).padStart(3, '0')}`,
    emiNo: String(idx+1).padStart(3, '0'),
    date: p.date,
    method: p.method,
    amount: parseFloat(p.amount),
    status: p.status === 'Paid' ? 'Paid' : 'Failed'
  })).sort((a, b) => new Date(b.date) - new Date(a.date));

  // Get dynamic settings
  const settings = await SystemSetting.findAll({ where: { key: ['late_due_fee'] } });
  let globalLateDueFee = 100.0;
  settings.forEach(s => {
    if (s.key === 'late_due_fee' && !isNaN(parseFloat(s.value))) globalLateDueFee = parseFloat(s.value);
  });

  let finalNextDueAmount = parseFloat(loan.nextDueAmount);
  let finalFees = parseFloat(loan.feesBreakdown || 0);
  let appliedPenalty = parseFloat(loan.penaltyAmount || 0); // Previous unpaid penalties
  let finalOutstanding = calculatedOutstanding;
  let dynamicLateFee = 0;
  let dynamicLateDueInterest = 0;
  let lateDueInterestRate = parseFloat(loan.lateDueInterestRate || 0);

  // Check if overdue
  if (loan.nextDueDate) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const dueDate = new Date(loan.nextDueDate);
    dueDate.setHours(0,0,0,0);

    // If strictly overdue, and the loan is not fully paid
    if (today > dueDate && calculatedOutstanding > 0) {
      if (loan.lastPenaltyDate === loan.nextDueDate) {
        // Penalty already applied and saved for this cycle
        dynamicLateDueInterest = parseFloat(loan.lateDueInterest || 0);
        dynamicLateFee = parseFloat(loan.lateDueFee || 0);
      } else {
        // Calculate new penalty
        dynamicLateDueInterest = Math.round(calculatedOutstanding * (lateDueInterestRate / 100) * 100) / 100;
        dynamicLateFee = globalLateDueFee;
      }
      
      // Ensure we don't double count if it's already in appliedPenalty from DB,
      // but if we are previewing the active loan without persisting, we add it.
      if (loan.lastPenaltyDate !== loan.nextDueDate) {
        appliedPenalty += (dynamicLateFee + dynamicLateDueInterest);
        finalNextDueAmount += (dynamicLateFee + dynamicLateDueInterest);
        finalOutstanding += (dynamicLateFee + dynamicLateDueInterest);
      }
    }
  }

  return {
    id: loan.loanReference,
    type: loan.type,
    principal: parseFloat(loan.principal),
    outstanding: finalOutstanding,
    paid: totalPaid,
    interestRate: parseFloat(loan.interestRate),
    termMonths: loan.termMonths,
    paidEmis: calculatedPaidEmis,
    nextDueAmount: finalNextDueAmount,
    nextDueDate: loan.nextDueDate,
    paymentMethod: loan.paymentMethod,
    breakdown: {
      principal: parseFloat(loan.principalBreakdown),
      interest: parseFloat(loan.interestBreakdown),
      fees: finalFees,
      penalty: appliedPenalty,
    },
    transactions: mappedTransactions,
  };
};

const getOverdueDetails = async (loanId, userId) => {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(loanId);
  const whereClause = isUUID ? { id: loanId, userId } : { loanReference: loanId, userId };
  
  const loan = await Loan.findOne({ where: whereClause });
  if (!loan) throw new NotFoundError('Loan not found');

  const settings = await SystemSetting.findAll({ where: { key: ['late_due_fee'] } });
  let globalLateDueFee = 100.0;
  settings.forEach(s => {
    if (s.key === 'late_due_fee' && !isNaN(parseFloat(s.value))) globalLateDueFee = parseFloat(s.value);
  });

  let daysOverdue = 0;
  let lateDueInterest = 0;
  let lateDueFee = 0;
  let lateDueInterestRate = parseFloat(loan.lateDueInterestRate || 0);
  let totalLateDueAmount = 0;
  
  const payments = await Payment.findAll({ where: { loanId: loan.id, status: 'Paid' } });
  const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const remainingAmount = parseFloat(loan.outstanding);

  if (loan.nextDueDate && remainingAmount > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(loan.nextDueDate);
    dueDate.setHours(0, 0, 0, 0);

    if (today > dueDate) {
      const diffTime = Math.abs(today - dueDate);
      daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (loan.lastPenaltyDate === loan.nextDueDate) {
        // Use historical locked-in values
        lateDueInterestRate = parseFloat(loan.lateDueInterestRate || 0);
        lateDueInterest = parseFloat(loan.lateDueInterest || 0);
        lateDueFee = parseFloat(loan.lateDueFee || 0);
        totalLateDueAmount = remainingAmount + lateDueInterest + lateDueFee;
      } else {
        // Calculate new values
        lateDueInterest = Math.round(remainingAmount * (lateDueInterestRate / 100) * 100) / 100;
        lateDueFee = globalLateDueFee;
        totalLateDueAmount = remainingAmount + lateDueInterest + lateDueFee;
      }
    }
  }

  return {
    loanReference: loan.loanReference,
    originalLoanAmount: parseFloat(loan.principal),
    paidAmount: totalPaid,
    remainingAmount,
    existingInterestRate: parseFloat(loan.interestRate),
    lateDueInterestRate,
    lateDueInterest,
    lateDueFee,
    totalLateDueAmount,
    daysOverdue
  };
};

module.exports = {
  getActiveLoanByUserId,
  getOverdueDetails,
};
