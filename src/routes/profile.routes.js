const express = require('express');
const profileController = require('../controllers/profile.controller');
const validate = require('../middleware/validation.middleware');
const { protect } = require('../middleware/auth.middleware');
const {
  updateProfileSchema,
  updatePreferencesSchema,
  changePasswordSchema,
} = require('../utils/validationSchemas');

const router = express.Router();

router.use(protect); // Secure all profile endpoints

router.get('/', profileController.getProfile);
router.put('/', validate(updateProfileSchema), profileController.updateProfile);
router.patch('/preferences', validate(updatePreferencesSchema), profileController.updatePreferences);
router.post('/change-password', validate(changePasswordSchema), profileController.changePassword);

module.exports = router;
