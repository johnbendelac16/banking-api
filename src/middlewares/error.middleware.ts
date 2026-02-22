import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * Global error handler. Maps known domain errors to 400,
 * duplicate key errors to 409, and everything else to 500.
 */

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error(`${req.method} ${req.path} - ${err.message}`);

  const clientErrors = [
    'not found',
    'blocked',
    'insufficient',
    'limit exceeded',
    'already blocked',
  ];
  if (clientErrors.some((msg) => err.message.toLowerCase().includes(msg))) {
    sendError(res, err.message, 400);
    return;
  }

  if ((err as { code?: number }).code === 11000) {
    sendError(res, 'Duplicate key error', 409);
    return;
  }

  sendError(res, 'Internal server error', 500);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  sendError(res, `Route ${req.originalUrl} not found`, 404);
};
