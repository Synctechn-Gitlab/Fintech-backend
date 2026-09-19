const express = require('express');
const loanController = require('../controllers/loan.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect); // Secure all loan endpoints

router.get('/active', loanController.getActiveLoan);
router.get('/:id/overdue', loanController.getOverdue);
router.get('/:id/late-due', loanController.getLateDue);

module.exports = router;
