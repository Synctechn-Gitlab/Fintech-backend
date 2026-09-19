const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().required().messages({
    'any.required': 'Email or Customer ID is required',
    'string.empty': 'Please enter your email or Customer ID'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required',
  }),
});

const signupSchema = Joi.object({
  name: Joi.string().min(2).required().messages({
    'string.min': 'Name must be at least 2 characters',
    'any.required': 'Name is required',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required',
  }),
  phone: Joi.string().required().messages({
    'any.required': 'Phone number is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required',
  }),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().required().messages({
    'any.required': 'Email or Customer ID is required',
    'string.empty': 'Please enter your email or Customer ID'
  }),
});

const resetPasswordSchema = Joi.object({
  email: Joi.string().required(),
  otp: Joi.string().length(6).required().messages({
    'string.length': 'OTP must be exactly 6 digits',
    'any.required': 'OTP is required',
  }),
  newPassword: Joi.string().min(6).required().messages({
    'string.min': 'New password must be at least 6 characters',
    'any.required': 'New password is required',
  }),
});

const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).optional(),
  email: Joi.string().email().optional(),
});

const updatePreferencesSchema = Joi.object({
  darkMode: Joi.boolean().optional(),
  notifications: Joi.boolean().optional(),
  loginAlerts: Joi.boolean().optional(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

const processPaymentSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required().messages({
    'number.positive': 'Payment amount must be greater than zero',
    'any.required': 'Payment amount is required',
  }),
  method: Joi.string().required().messages({
    'any.required': 'Payment method is required',
  }),
});

module.exports = {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  updatePreferencesSchema,
  changePasswordSchema,
  processPaymentSchema,
};
