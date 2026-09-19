const { BadRequestError } = require('../utils/errors');

const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { value, error } = schema.validate(req[source], {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message.replace(/['"]/g, ''))
        .join(', ');
      return next(new BadRequestError(errorMessage));
    }

    // Replace original source with validated, parsed, and stripped value
    req[source] = value;
    next();
  };
};

module.exports = validate;
