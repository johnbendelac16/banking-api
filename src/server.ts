import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDB } from './config/database';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3000;

const start = async () => {
  await connectDB();
  const server = app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));

  process.on('SIGTERM', () => server.close(() => process.exit(0)));
  process.on('SIGINT', () => server.close(() => process.exit(0)));
};

start();
