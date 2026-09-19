const { Payment, Loan, User, SystemSetting, sequelize } = require('../models');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const logger = require('../config/logger');

const getPayments = async (userId, status, limit = 10, offset = 0) => {
  const where = { userId };
  if (status && status !== 'All') {
    where.status = status;
  }

  const { count, rows } = await Payment.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['date', 'DESC']],
  });

  return {
    count,
    payments: rows.map(r => {
      let typeLabel = 'EMI Payment';
      if (r.paymentType === 'custom') typeLabel = 'Partial Payment';
      if (r.paymentType === 'full') typeLabel = 'Total Payment';
      
      return {
        id: r.transactionReference,
        emiNo: r.emiNo,
        date: r.date,
        method: r.method,
        amount: parseFloat(r.amount),
        status: r.status,
        type: typeLabel,
      };
    }),
  };
};

const getCalendarEvents = async (userId, year, month) => {
  const loan = await Loan.findOne({ where: { userId } });
  if (!loan) {
    return { paidDates: [], dueDates: [] };
  }

  // Get all paid dates
  const payments = await Payment.findAll({
    where: {
      userId,
      status: 'Paid',
    },
    attributes: ['date'],
  });

  const paidDates = payments.map(p => p.date);
  const dueDates = [loan.nextDueDate];

  return {
    paidDates,
    dueDates,
  };
};

const processRepayment = async (userId, amount, method, paymentType) => {
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new BadRequestError('Invalid payment amount');
  }

  // Perform inside a transaction
  return await sequelize.transaction(async (t) => {
    const loan = await Loan.findOne({ where: { userId }, transaction: t });
    if (!loan) {
      throw new NotFoundError('No active loan found to process payment');
    }

    const settings = await SystemSetting.findAll({ where: { key: ['late_due_fee'] }, transaction: t });
    let globalLateDueFee = 100.0;
    settings.forEach(s => {
      if (s.key === 'late_due_fee' && !isNaN(parseFloat(s.value))) globalLateDueFee = parseFloat(s.value);
    });
    
    let currentOutstanding = parseFloat(loan.outstanding);
    let currentPenalty = parseFloat(loan.penaltyAmount || 0);
    
    let dynamicLateFee = 0;
    let dynamicLateDueInterest = 0;
    let daysOverdue = 0;
    let lateDueInterestRate = parseFloat(loan.lateDueInterestRate || 0);

    // Calculate dynamic penalties if overdue
    if (loan.nextDueDate) {
      const today = new Date(); today.setHours(0,0,0,0);
      const dueDate = new Date(loan.nextDueDate); dueDate.setHours(0,0,0,0);
      
      if (today > dueDate && currentOutstanding > 0) {
        const diffTime = Math.abs(today - dueDate);
        daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (loan.lastPenaltyDate === loan.nextDueDate) {
          // Penalty already applied this cycle, retrieve locked values
          dynamicLateDueInterest = parseFloat(loan.lateDueInterest || 0);
          dynamicLateFee = parseFloat(loan.lateDueFee || 0);
        } else {
          // Apply new penalty based on outstanding
          dynamicLateDueInterest = Math.round(currentOutstanding * (lateDueInterestRate / 100) * 100) / 100;
          dynamicLateFee = globalLateDueFee;
          
          // Lock these values on the loan
          loan.lastPenaltyDate = loan.nextDueDate;
          loan.lateDueInterest = dynamicLateDueInterest;
          loan.lateDueFee = dynamicLateFee;
          loan.totalLateDueAmount = currentOutstanding + dynamicLateDueInterest + dynamicLateFee;
          loan.daysOverdue = daysOverdue;
          loan.lateDueAppliedAt = new Date();
          
          // Only add to the running penalty accumulator if it's the first time
          currentPenalty += (dynamicLateFee + dynamicLateDueInterest);
        }
      }
    }

    const totalOwed = currentOutstanding + currentPenalty;

    if (numericAmount > totalOwed) {
      throw new BadRequestError(`Payment amount cannot exceed total outstanding balance including penalties of ${totalOwed.toFixed(2)}`);
    }

    // Payment Allocation: Penalties first, then normal outstanding
    const penaltyDeduction = Math.min(numericAmount, currentPenalty);
    const newPenalty = Math.max(0, currentPenalty - penaltyDeduction);
    
    const remainingPayment = numericAmount - penaltyDeduction;
    const newOutstanding = Math.max(0, currentOutstanding - remainingPayment);

    const emiValue = parseFloat(loan.nextDueAmount);
    // Only advance EMI if they paid at least one full EMI amount towards the outstanding
    const emiCountPaid = Math.floor(remainingPayment / emiValue);
    
    const newPaid = parseFloat(loan.paid) + numericAmount;
    const newPaidEmis = Math.min(loan.termMonths, loan.paidEmis + emiCountPaid);

    // Calculate new due date if EMI was paid
    let newDueDate = loan.nextDueDate;
    if (emiCountPaid > 0) {
      const [y, m, d] = loan.nextDueDate.split('-');
      let newYear = parseInt(y, 10);
      let newMonth = parseInt(m, 10) + emiCountPaid;
      const originalDay = parseInt(d, 10);
      
      while (newMonth > 12) {
        newMonth -= 12;
        newYear += 1;
      }
      
      const maxDays = new Date(newYear, newMonth, 0).getDate();
      const adjustedDay = Math.min(originalDay, maxDays);
      newDueDate = `${newYear}-${String(newMonth).padStart(2, '0')}-${String(adjustedDay).padStart(2, '0')}`;
    }

    // Get next EMI sequence number
    const paymentCount = await Payment.count({ where: { userId }, transaction: t });
    const nextEmiNo = String(paymentCount + 1).padStart(3, '0');
    
    // Generate unique transaction reference to avoid unique constraint violations
    const uniqueTxRef = `TX-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`;

    // Generate strict dynamic type fallback just in case
    let finalPaymentType = paymentType;
    if (!finalPaymentType) {
      if (remainingPayment >= emiValue) finalPaymentType = 'emi';
      else if (numericAmount >= totalOwed) finalPaymentType = 'full';
      else finalPaymentType = 'custom';
    }

    // Create payment
    const payment = await Payment.create({
      transactionReference: uniqueTxRef,
      userId,
      loanId: loan.id,
      emiNo: nextEmiNo,
      amount: numericAmount,
      date: new Date().toISOString().split('T')[0],
      method: method || 'HDFC Bank ••4421',
      status: 'Paid',
      paymentType: finalPaymentType,
    }, { transaction: t });

    // Update loan
    await loan.update({
      outstanding: newOutstanding,
      penaltyAmount: newPenalty,
      lastPenaltyDate: loan.lastPenaltyDate,
      lateDueInterestRate: loan.lateDueInterestRate,
      lateDueInterest: loan.lateDueInterest,
      lateDueFee: loan.lateDueFee,
      totalLateDueAmount: loan.totalLateDueAmount,
      daysOverdue: loan.daysOverdue,
      lateDueAppliedAt: loan.lateDueAppliedAt,
      paid: newPaid,
      paidEmis: newPaidEmis,
      nextDueDate: newDueDate,
    }, { transaction: t });

    return {
      transaction: {
        id: payment.transactionReference,
        emiNo: payment.emiNo,
        amount: parseFloat(payment.amount),
        method: payment.method,
        date: payment.date,
        status: payment.status,
      },
      updatedLoan: {
        outstanding: parseFloat(loan.outstanding),
        paid: parseFloat(loan.paid),
        paidEmis: loan.paidEmis,
        nextDueDate: loan.nextDueDate,
      }
    };
  });
};

const getPaymentReceipt = async (userId, transactionReference) => {
  const payment = await Payment.findOne({
    where: { userId, transactionReference },
  });

  if (!payment) {
    throw new NotFoundError('Transaction not found');
  }

  const loan = await Loan.findByPk(payment.loanId);
  const user = await User.findByPk(userId);

  return {
    id: `REC-${payment.transactionReference}`,
    transactionId: payment.transactionReference,
    date: payment.date,
    customer: {
      name: user.name,
      id: user.customerId,
      email: user.email,
    },
    loan: {
      id: loan.loanReference,
      type: loan.type,
      interestRate: parseFloat(loan.interestRate),
    },
    payment: {
      emiNo: payment.emiNo,
      method: payment.method,
      amount: parseFloat(payment.amount),
      breakdown: {
        principal: parseFloat(payment.amount) * 0.79,
        interest: parseFloat(payment.amount) * 0.17,
        fees: parseFloat(payment.amount) * 0.04,
      },
    },
  };
};

module.exports = {
  getPayments,
  getCalendarEvents,
  processRepayment,
  getPaymentReceipt,
};
