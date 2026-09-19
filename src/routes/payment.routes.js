const express = require('express');
const paymentController = require('../controllers/payment.controller');
const validate = require('../middleware/validation.middleware');
const { protect } = require('../middleware/auth.middleware');
const { processPaymentSchema } = require('../utils/validationSchemas');

const router = express.Router();

router.use(protect); // Secure all payment endpoints

router.get('/', paymentController.getPayments);
router.get('/calendar', paymentController.getCalendar);
router.post('/', validate(processPaymentSchema), paymentController.processPayment);
router.get('/:id/receipt', paymentController.getReceipt);
router.get('/:id/receipt/download', paymentController.downloadReceipt);

module.exports = router;
