const loanService = require('../services/loan.service');

const getActiveLoan = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const loanData = await loanService.getActiveLoanByUserId(userId);

    res.status(200).json({
      success: true,
      data: loanData,
    });
  } catch (error) {
    next(error);
  }
};

const getOverdue = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const overdueData = await loanService.getOverdueDetails(id, userId);

    res.status(200).json({
      success: true,
      data: overdueData,
    });
  } catch (error) {
    next(error);
  }
};

const getLateDue = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const overdueData = await loanService.getOverdueDetails(id, userId);

    res.status(200).json({
      success: true,
      data: overdueData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActiveLoan,
  getOverdue,
  getLateDue,
};
