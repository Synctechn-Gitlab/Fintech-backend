const paymentService = require('../services/payment.service');
const { generateReceiptText } = require('../utils/receipt');

const getPayments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status, limit, offset } = req.query;
    const data = await paymentService.getPayments(userId, status, limit, offset);

    res.status(200).json({
      success: true,
      count: data.count,
      payments: data.payments,
    });
  } catch (error) {
    next(error);
  }
};

const getCalendar = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { year, month } = req.query;
    const data = await paymentService.getCalendarEvents(userId, year, month);

    res.status(200).json({
      success: true,
      paidDates: data.paidDates,
      dueDates: data.dueDates,
    });
  } catch (error) {
    next(error);
  }
};

const processPayment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { amount, method, paymentType } = req.body;
    const result = await paymentService.processRepayment(userId, amount, method, paymentType);

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully.',
      transaction: result.transaction,
      updatedLoan: result.updatedLoan,
    });
  } catch (error) {
    next(error);
  }
};

const getReceipt = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const receiptData = await paymentService.getPaymentReceipt(userId, id);

    res.status(200).json({
      success: true,
      receipt: receiptData,
    });
  } catch (error) {
    next(error);
  }
};

const downloadReceipt = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    // Fetch transaction details
    const receiptData = await paymentService.getPaymentReceipt(userId, id);

    // Map database fields to template expected fields
    const paymentArg = {
      id: receiptData.transactionId,
      date: receiptData.date,
      emiNo: receiptData.payment.emiNo,
      method: receiptData.payment.method,
      amount: receiptData.payment.amount
    };

    const loanArg = {
      loanReference: receiptData.loan.id,
      type: receiptData.loan.type,
      interestRate: receiptData.loan.interestRate
    };

    const userArg = {
      name: receiptData.customer.name,
      customerId: receiptData.customer.id,
      email: receiptData.customer.email
    };

    const text = generateReceiptText(paymentArg, loanArg, userArg);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=receipt_EMI_${receiptData.payment.emiNo}.txt`
    );
    res.status(200).send(text);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPayments,
  getCalendar,
  processPayment,
  getReceipt,
  downloadReceipt,
};
