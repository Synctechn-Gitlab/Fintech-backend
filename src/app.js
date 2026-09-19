require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const logger = require('./config/logger');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./config/swagger.json');
const apiRoutes = require('./routes');
const errorHandler = require('./middleware/error.middleware');
const { NotFoundError } = require('./utils/errors');

const app = express();

// Disable ETags to prevent 304 Not Modified caching responses
app.disable('etag');

// CORS config - Support configured FRONTEND_URL and local dev origins
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman) or matching allowedOrigins
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));

// Request parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Morgan logger stream to Winston
const morganStream = {
  write: (message) => logger.http(message.trim()),
};
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream: morganStream }));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Mount API routes
app.use('/api/v1', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'UP',
    timestamp: new Date(),
  });
});

// Capture 404 Route Errors
app.use((req, res, next) => {
  next(new NotFoundError(`Route ${req.originalUrl} not found`));
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
