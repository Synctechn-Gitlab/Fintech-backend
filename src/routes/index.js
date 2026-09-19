const express = require('express');
const authRoutes = require('./auth.routes');
const profileRoutes = require('./profile.routes');
const loanRoutes = require('./loan.routes');
const paymentRoutes = require('./payment.routes');

const router = express.Router();

router.use('/admin', require('./admin.routes'));

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/loans', loanRoutes);
router.use('/payments', paymentRoutes);

module.exports = router;
