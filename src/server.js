const app = require('./app');
const { sequelize } = require('./models');
const { seedDatabase } = require('./config/initDb');
const logger = require('./config/logger');

const PORT = process.env.PORT || 5000;

// Catch uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...');
  logger.error(`${err.name}: ${err.message}`);
  logger.error(err.stack);
  process.exit(1);
});

const startServer = async () => {
  try {
    logger.info('Connecting to database...');
    await sequelize.authenticate();
    
    // Check if connected to Supabase Database
    if (process.env.DB_HOST && process.env.DB_HOST.includes('supabase.co')) {
      logger.info('Supabase database connection established successfully.');
    } else {
      logger.info('Database connection established successfully.');
    }

    // Check if Supabase Client is initialized
    const supabase = require('./config/supabase');
    if (supabase) {
      logger.info('Supabase client is connected and ready to use.');
    }

    logger.info('Initializing database schemas and seed records...');
    await seedDatabase();

    const server = app.listen(PORT, () => {
      logger.info(`Server listening on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
    });

    // Catch unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      logger.error('UNHANDLED REJECTION! Shutting down gracefully...');
      logger.error(`${err.name}: ${err.message}`);
      logger.error(err.stack);
      server.close(() => {
        process.exit(1);
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
