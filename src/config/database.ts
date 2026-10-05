import { Sequelize } from 'sequelize';
// @ts-ignore
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30000,
});

const sequelize = new Sequelize(process.env.DATABASE_URL!, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
      // Add these additional SSL options
      sslmode: 'require'
    },
    // Keep connection alive
    keepAlive: true,
    // Connection timeout
    connectTimeout: 60000
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 60000,
    idle: 10000
  },
  // Retry logic
  retry: {
    max: 3,
    match: [
      /ECONNRESET/,
      /ETIMEDOUT/,
      /SequelizeConnectionError/
    ]
  }
});

export default sequelize;