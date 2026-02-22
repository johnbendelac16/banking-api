import { body } from 'express-validator';
import { AccountType } from '../models/Account';

const validAccountTypes = Object.values(AccountType).filter((v) => typeof v === 'number');

export const createAccountValidation = [
  body('personId').isInt({ min: 1 }).withMessage('personId must be a positive integer'),
  body('dailyWithdrawalLimit')
    .isFloat({ min: 0.01 })
    .withMessage('dailyWithdrawalLimit must be positive'),
  body('accountType')
    .isIn(validAccountTypes)
    .withMessage(`accountType must be one of: ${validAccountTypes.join(', ')}`),
  body('initialBalance').optional().isFloat({ min: 0 }).withMessage('initialBalance must be >= 0'),
];

export const transactionValidation = [
  body('value').isFloat({ min: 0.01 }).withMessage('value must be greater than 0'),
];
