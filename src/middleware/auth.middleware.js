const jwt = require('jsonwebtoken');
const { UnauthorizedError, AppError } = require('../utils/errors');
const { User, UserPreference } = require('../models');

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new UnauthorizedError('Please log in to access this resource'));
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkeyfornovafinance123');
    } catch (err) {
      return next(new UnauthorizedError('Invalid or expired authentication token'));
    }

    let user;
    if (decoded.id === 'super-admin') {
      user = {
        id: 'super-admin',
        role: 'superadmin',
        name: 'Super Admin'
      };
    } else {
      // Check if user still exists
      user = await User.findByPk(decoded.id, {
        include: [{ model: UserPreference, as: 'preferences' }]
      });
    }

    if (!user) {
      return next(new UnauthorizedError('The user belonging to this token no longer exists'));
    }

    // Grant access to protected route
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError(`User role ${req.user ? req.user.role : 'none'} is not authorized to access this route`));
    }
    next();
  };
};

module.exports = {
  protect,
  authorize,
};
