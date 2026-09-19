const { Sequelize } = require('sequelize');
const path = require('path');
const logger = require('./logger');

let sequelize;

if (process.env.DATABASE_URL) {
  // PostgreSQL using a single connection string (DATABASE_URL)
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: (msg) => logger.debug(msg),
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true'
        ? { require: true, rejectUnauthorized: false }
        : false,
    },
  });
} else if ((process.env.DB_DIALECT || 'sqlite') === 'sqlite') {
  const storagePath = process.env.DB_STORAGE || './database.sqlite';
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.resolve(storagePath),
    logging: (msg) => logger.debug(msg),
  });
} else {
  // PostgreSQL using individual parameters (safe for passwords with special chars like @, #, !)
  sequelize = new Sequelize(
    process.env.DB_NAME     || 'hidelfinance',
    process.env.DB_USER     || 'postgres',
    process.env.DB_PASSWORD || 'password@123',
    {
      host:    process.env.DB_HOST || 'localhost',
      port:    parseInt(process.env.DB_PORT || '5432'),
      dialect: 'postgres',
      logging: (msg) => logger.debug(msg),
      dialectOptions: {
        ssl: process.env.DB_SSL === 'true'
          ? { require: true, rejectUnauthorized: false }
          : false,
      },
    }
  );
}

module.exports = sequelize;
