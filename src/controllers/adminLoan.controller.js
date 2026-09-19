const { Loan, User, SystemSetting } = require('../models');

const getAllLoans = async (req, res, next) => {
  try {
    const loans = await Loan.findAll({
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'customerId'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ success: true, data: loans });
  } catch (error) {
    next(error);
  }
};

const createLoan = async (req, res, next) => {
  try {
    const { customerName, email, phone, type, principal, interestRate, termMonths, nextDueDate, paymentMethod, status } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    let user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      if (!customerName || !phone) {
        return res.status(400).json({ success: false, message: 'Name and phone are required for a new user' });
      }
      const crypto = require('crypto');
      const generatedPassword = crypto.randomBytes(8).toString('base64').slice(0, 8);
      user = await User.create({
        customerId: `CUS-${Math.floor(1000 + Math.random() * 9000)}`,
        name: customerName,
        email: email.toLowerCase(),
        phone,
        passwordHash: generatedPassword,
        kycStatus: 'pending',
        creditScore: 750
      });
    }

    const userId = user.id;

    const loanReference = `LN-${Math.floor(10000 + Math.random() * 90000)}`;
    const term = parseInt(termMonths) || 36;
    const amount = parseFloat(principal) || 0;
    
    let globalInterestRate = 10.5;
    const rateSetting = await SystemSetting.findOne({ where: { key: 'annual_interest_rate' } });
    if (rateSetting && !isNaN(parseFloat(rateSetting.value))) {
      globalInterestRate = parseFloat(rateSetting.value);
    }
    
    const rate = parseFloat(interestRate) || globalInterestRate;
    
    const termInYears = term / 12;
    const totalInterest = amount * (rate / 100) * termInYears;
    const calculatedEmi = term > 0 ? Math.round((amount + totalInterest) / term) : 0;
    
    const newLoan = await Loan.create({
      loanReference,
      userId,
      type: type || 'Personal Loan',
      principal: amount,
      outstanding: calculatedEmi * term,
      paid: 0,
      interestRate: rate,
      termMonths: term,
      paidEmis: 0,
      nextDueAmount: calculatedEmi,
      nextDueDate: nextDueDate || new Date(),
      paymentMethod: paymentMethod || 'Manual Pay',
      status: status || 'Pending',
      emiStatus: 'Not Started',
      principalBreakdown: amount,
      interestBreakdown: totalInterest,
      feesBreakdown: 0
    });

    res.status(201).json({ success: true, data: newLoan });
  } catch (error) {
    next(error);
  }
};

const updateLoan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const loan = await Loan.findByPk(id);
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    const allowed = ['type', 'principal', 'interestRate', 'termMonths', 'nextDueDate', 'paymentMethod', 'status', 'emiStatus', 'penaltyAmount', 'latePaymentCount'];
    allowed.forEach(field => {
      if (updates[field] !== undefined) {
        loan[field] = updates[field];
      }
    });

    await loan.save();
    res.status(200).json({ success: true, data: loan });
  } catch (error) {
    next(error);
  }
};

const deleteLoan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const loan = await Loan.findByPk(id);
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    await loan.destroy();
    res.status(200).json({ success: true, message: 'Loan deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllLoans,
  createLoan,
  updateLoan,
  deleteLoan
};
