const { User, Loan, Payment, SystemSetting } = require('../models');
const sequelize = require('../config/database');
const crypto = require('crypto');

const generateRandomPassword = (length = 8) => {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
};

const createUser = async (req, res, next) => {
  try {
    const { 
      customerName, 
      phone, 
      email, 
      loanType, 
      status, 
      dueDate, 
      totalLoanAmount, 
      termMonths,
      startDate,
      monthlyEmi,
      interestRate,
      lateDueInterestRate,
      address, 
      notes 
    } = req.body;

    // Validate required fields
    if (!customerName || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Name, email, and phone are required.' });
    }

    // Generate unique IDs and password
    const customerId = `CUS-${Math.floor(1000 + Math.random() * 9000)}`;
    const generatedPassword = generateRandomPassword(8);

    const transaction = await sequelize.transaction();

    try {
      // Create User
      const newUser = await User.create({
        customerId,
        name: customerName,
        email: email.toLowerCase(),
        phone,
        passwordHash: generatedPassword, // Hook will hash it
        kycStatus: 'pending', // Default to pending since we removed KYC status from the form
        creditScore: 750, // Default for new customers
        address,
        notes,
        isVerified: true, // Super Admin created users bypass OTP
      }, { transaction });

      // Handle Loan Creation if totalLoanAmount > 0
      let newLoan = null;
      let loanReference = null;
      const amount = parseFloat(totalLoanAmount) || 0;
      const term = parseInt(termMonths) || 36;
      
      // Fetch global setting for interest rate fallback
      let globalInterestRate = 10.5;
      const rateSetting = await SystemSetting.findOne({ where: { key: 'annual_interest_rate' }, transaction });
      if (rateSetting && !isNaN(parseFloat(rateSetting.value))) {
        globalInterestRate = parseFloat(rateSetting.value);
      }
      
      // Parse Start Date or default to today
      const loanStartDate = startDate ? new Date(startDate) : new Date();
      // Next due date is provided or one month after the start date
      let nextDueDate = new Date(loanStartDate);
      if (dueDate) {
        nextDueDate = new Date(dueDate);
      } else {
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      }

      // Calculate EMI using flat rate simple interest
      const appliedInterestRate = interestRate && parseFloat(interestRate) > 0 ? parseFloat(interestRate) : globalInterestRate;
      const termInYears = term / 12;
      const totalInterest = amount * (appliedInterestRate / 100) * termInYears;
      const calculatedEmi = term > 0 ? Math.round((amount + totalInterest) / term) : 0;
        
      // Use manually provided EMI if available, otherwise fallback to calculation
      const emi = monthlyEmi && parseFloat(monthlyEmi) > 0 ? parseFloat(monthlyEmi) : calculatedEmi;
      
      const appliedLateDueInterestRate = lateDueInterestRate !== undefined && parseFloat(lateDueInterestRate) >= 0 ? parseFloat(lateDueInterestRate) : 0;

      if (amount > 0) {
        loanReference = `LN-${Math.floor(10000 + Math.random() * 90000)}`;
        newLoan = await Loan.create({
          loanReference,
          userId: newUser.id,
          type: loanType || 'Personal Loan', // Use selected loan type
          principal: amount,
          outstanding: emi * term,
          paid: 0,
          interestRate: appliedInterestRate,
          lateDueInterestRate: appliedLateDueInterestRate,
          termMonths: term,
          paidEmis: 0,
          nextDueAmount: emi,
          nextDueDate: nextDueDate, // Next month from start date
          paymentMethod: 'Manual Pay',
          principalBreakdown: amount,
          interestBreakdown: totalInterest,
          feesBreakdown: 0,
        }, { transaction });
      }

      await transaction.commit();

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          user: {
            id: newUser.id,
            customerId: newUser.customerId,
            name: newUser.name,
            email: newUser.email,
            phone: newUser.phone,
          },
          credentials: {
            password: generatedPassword, // Return plain text password so admin can share it
          },
          loan: newLoan ? {
            id: newLoan.id,
            loanReference: newLoan.loanReference,
            principal: newLoan.principal,
          } : null
        }
      });
    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError; // Will be caught by the outer catch block
    }

  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: 'Email or Customer ID already exists.' });
    }
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
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
      const loanCount = loans.length;
      const totalLoanAmount = loans.reduce((sum, loan) => sum + Number(loan.principal || 0), 0);
      const outstandingAmount = loans.reduce((sum, loan) => {
        const expectedTotalAmount = parseFloat(loan.nextDueAmount) * loan.termMonths;
        const loanPayments = payments.filter(p => p.loanId === loan.id && p.status === 'Paid');
        const totalPaid = loanPayments.reduce((s, p) => s + parseFloat(p.amount), 0);
        return sum + Math.max(0, expectedTotalAmount - totalPaid);
      }, 0);
      const dueDate = loans.length > 0 && loans[0].nextDueDate ? new Date(loans[0].nextDueDate).toISOString().split('T')[0] : null;
      
      // format kycStatus to match frontend expected format e.g. "verified" -> "Verified"
      const kycStatusFormat = userObj.kycStatus 
        ? userObj.kycStatus.charAt(0).toUpperCase() + userObj.kycStatus.slice(1)
        : 'Pending';

      return {
        id: userObj.customerId,
        customerName: userObj.name,
        email: userObj.email,
        phone: userObj.phone,
        kycStatus: kycStatusFormat,
        status: userObj.status || 'Active', // Fallback for old data
        dueDate,
        loanCount,
        totalLoanAmount,
        outstandingAmount,
        plainPassword: userObj.plainPassword || 'password123', // Default for old users we'll reset
        createdDate: new Date(userObj.createdAt).toISOString().split('T')[0],
        loans: loans.map(l => {
          const expectedTotalAmount = parseFloat(l.nextDueAmount) * l.termMonths;
          const loanPayments = payments.filter(p => p.loanId === l.id && p.status === 'Paid');
          const totalPaid = loanPayments.reduce((s, p) => s + parseFloat(p.amount), 0);
          const trueOutstanding = Math.max(0, expectedTotalAmount - totalPaid);

          return {
            loanId: l.loanReference,
            applicationDate: new Date(l.createdAt).toISOString().split('T')[0],
            loanType: l.type,
            loanAmount: l.principal,
            interestRate: l.interestRate,
            lateDueInterestRate: l.lateDueInterestRate || 0,
            outstanding: trueOutstanding,
            status: l.status || 'Active' // Default to Active if status not present
          };
        }),
        transactions: payments.map(p => {
          const loanForTx = loans.find(l => l.id === p.loanId);
          const expectedEmi = loanForTx ? parseFloat(loanForTx.nextDueAmount) : 0;
          
          let typeLabel = 'EMI Payment';
          if (p.paymentType) {
            if (p.paymentType === 'custom') typeLabel = 'Partial Payment';
            if (p.paymentType === 'full') typeLabel = 'Total Payment';
          } else {
            // fallback for legacy records
            const isPartial = expectedEmi > 0 && parseFloat(p.amount) !== expectedEmi;
            if (isPartial) typeLabel = 'Partial Payment';
          }
          
          return {
            transactionId: p.transactionReference,
            date: p.date,
            type: typeLabel,
            paymentMethod: p.method,
            amount: p.amount,
            status: p.status === 'Paid' ? 'Success' : 'Failed'
          };
        }).sort((a, b) => new Date(b.date) - new Date(a.date)), // Sort by date descending
        address: userObj.address || '',
        notes: userObj.notes || '',
      };
    });

    res.status(200).json({
      success: true,
      data: formattedUsers
    });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params; // this is the customerId like CUS-1234
    const { 
      customerName, 
      phone, 
      email, 
      loanType, 
      status,
      termMonths,
      totalLoanAmount,
      dueDate,
      monthlyEmi,
      interestRate,
      lateDueInterestRate,
      address, 
      notes 
    } = req.body;

    const user = await User.findOne({ where: { customerId: id }, transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (customerName) user.name = customerName;
    if (phone) user.phone = phone;
    if (email) user.email = email.toLowerCase();
    if (address !== undefined) user.address = address;
    if (notes !== undefined) user.notes = notes;
    
    const loan = await Loan.findOne({ 
      where: { userId: user.id },
      order: [['createdAt', 'DESC']],
      transaction
    });
    if (loan) {
      if (loanType) loan.type = loanType;
      
      let amountChanged = false;
      if (totalLoanAmount !== undefined) {
        const amt = parseFloat(totalLoanAmount);
        if (!isNaN(amt) && amt !== loan.principal) {
          loan.principal = amt;
          loan.outstanding = loan.nextDueAmount * loan.termMonths;
          amountChanged = true;
        }
      }
      
      if (termMonths !== undefined) {
        const term = parseInt(termMonths);
        if (!isNaN(term) && term !== loan.termMonths) {
          loan.termMonths = term;
          amountChanged = true;
        }
      }

      if (dueDate) {
        loan.nextDueDate = dueDate;
      }

      if (interestRate !== undefined) {
        const rate = parseFloat(interestRate);
        if (!isNaN(rate) && rate !== loan.interestRate) {
          loan.interestRate = rate;
          amountChanged = true;
        }
      }

      if (lateDueInterestRate !== undefined) {
        const ldir = parseFloat(lateDueInterestRate);
        if (!isNaN(ldir) && ldir >= 0) {
          loan.lateDueInterestRate = ldir;
        } else {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: 'Invalid lateDueInterestRate' });
        }
      }

      // Recalculate EMI using flat rate simple interest if amount, term changed, interestRate changed, or manual EMI provided
      if (amountChanged || monthlyEmi !== undefined) {
        let globalInterestRate = 10.5;
        const rateSetting = await SystemSetting.findOne({ where: { key: 'annual_interest_rate' }, transaction });
        if (rateSetting && !isNaN(parseFloat(rateSetting.value))) {
          globalInterestRate = parseFloat(rateSetting.value);
        }

        const appliedInterestRate = loan.interestRate || globalInterestRate;
        const termInYears = loan.termMonths / 12;
        const totalInterest = loan.principal * (appliedInterestRate / 100) * termInYears;
        const calculatedEmi = loan.termMonths > 0 ? Math.round((loan.principal + totalInterest) / loan.termMonths) : 0;
          
        loan.nextDueAmount = monthlyEmi && parseFloat(monthlyEmi) > 0 ? parseFloat(monthlyEmi) : calculatedEmi;
        loan.outstanding = loan.nextDueAmount * loan.termMonths;
        
        if (amountChanged) {
          loan.principalBreakdown = loan.principal;
          loan.interestBreakdown = totalInterest;
          loan.feesBreakdown = 0;
        }
      }
      
      await loan.save({ transaction });
    } else if (totalLoanAmount && parseFloat(totalLoanAmount) > 0) {
      // User has no loan, but admin is assigning one during update (e.g. approving a new user)
      const amount = parseFloat(totalLoanAmount);
      const term = parseInt(termMonths) || 36;
      const loanStartDate = new Date();
      let nextDueDate = new Date();
      if (dueDate) {
        nextDueDate = new Date(dueDate);
      } else {
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      }

      let globalInterestRate = 10.5;
      const rateSetting = await SystemSetting.findOne({ where: { key: 'annual_interest_rate' }, transaction });
      if (rateSetting && !isNaN(parseFloat(rateSetting.value))) {
        globalInterestRate = parseFloat(rateSetting.value);
      }

      const appliedInterestRate = interestRate && parseFloat(interestRate) > 0 ? parseFloat(interestRate) : globalInterestRate;
      const termInYears = term / 12;
      const totalInterest = amount * (appliedInterestRate / 100) * termInYears;
      const calculatedEmi = term > 0 ? Math.round((amount + totalInterest) / term) : 0;
      const emi = monthlyEmi && parseFloat(monthlyEmi) > 0 ? parseFloat(monthlyEmi) : calculatedEmi;

      await Loan.create({
        loanReference: `LN-${Math.floor(10000 + Math.random() * 90000)}`,
        userId: user.id,
        type: loanType || 'Personal Loan',
        principal: amount,
        outstanding: emi * term,
        paid: 0,
        interestRate: appliedInterestRate,
        termMonths: term,
        paidEmis: 0,
        nextDueAmount: emi,
        nextDueDate: nextDueDate,
        paymentMethod: 'Manual Pay',
        principalBreakdown: amount,
        interestBreakdown: totalInterest,
        feesBreakdown: 0,
      }, { transaction });
    }
    
    if (status) {
      if (status === 'Active' && user.status === 'Pending') {
        user.customerId = `NV-${Math.floor(10000000 + Math.random() * 90000000)}`;
      }
      user.status = status;
    }
    
    await user.save({ transaction });
    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: {
          id: user.id,
          customerId: user.customerId,
          name: user.name,
          email: user.email,
          phone: user.phone,
          status: user.status
        }
      }
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: 'Email already exists for another user.' });
    }
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params; // this is the customerId like CUS-1234
    
    const user = await User.findOne({ where: { customerId: id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { Payment, UserPreference } = require('../models');
    
    // Delete associated data first to avoid foreign key constraints
    await UserPreference.destroy({ where: { userId: user.id } });
    
    const loans = await Loan.findAll({ where: { userId: user.id } });
    for (let loan of loans) {
      await Payment.destroy({ where: { loanId: loan.id } });
      await loan.destroy();
    }
    
    // Delete the user
    await user.destroy();

    res.status(200).json({
      success: true,
      message: 'User and all associated data deleted successfully from database',
    });
  } catch (error) {
    next(error);
  }
};

const getSettings = async (req, res, next) => {
  try {
    const settings = await SystemSetting.findAll();
    const config = {};
    settings.forEach(s => {
      config[s.key] = s.value;
    });
    res.status(200).json({ success: true, config });
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const updates = req.body;
    for (const key of Object.keys(updates)) {
      const value = String(updates[key]);
      await SystemSetting.upsert({ key, value });
    }
    res.status(200).json({ success: true, message: 'Settings updated' });
  } catch (error) {
    next(error);
  }
};

const getLoanSettings = async (req, res, next) => {
  try {
    const settings = await SystemSetting.findAll({
      where: { key: ['annual_interest_rate', 'late_due_fee'] }
    });
    
    const data = {
      annualInterestRate: 8.4,
      lateDueFee: 100.0       // default if not set
    };

    settings.forEach(s => {
      if (s.key === 'annual_interest_rate') data.annualInterestRate = parseFloat(s.value);
      if (s.key === 'late_due_fee') data.lateDueFee = parseFloat(s.value);
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const updateLoanSettings = async (req, res, next) => {
  try {
    const { annualInterestRate, lateDueFee } = req.body;

    if (annualInterestRate !== undefined) {
      const rate = parseFloat(annualInterestRate);
      if (isNaN(rate) || rate < 0) return res.status(400).json({ success: false, message: 'Invalid annualInterestRate' });
      await SystemSetting.upsert({ key: 'annual_interest_rate', value: String(rate) });
    }

    if (lateDueFee !== undefined) {
      const fee = parseFloat(lateDueFee);
      if (isNaN(fee) || fee < 0) return res.status(400).json({ success: false, message: 'Invalid lateDueFee' });
      await SystemSetting.upsert({ key: 'late_due_fee', value: String(fee) });
    }

    // A real system would log this audit event here.

    res.status(200).json({ success: true, message: 'Loan settings updated successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getSettings,
  updateSettings,
  getLoanSettings,
  updateLoanSettings,
};
