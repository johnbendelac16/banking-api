import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { accountService } from '../services/account.service';
import { sendSuccess, sendError } from '../utils/response';

export class AccountController {
  async createAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        sendError(res, 'Validation failed', 422, errors.array());
        return;
      }

      const account = await accountService.createAccount(req.body);
      sendSuccess(res, account, 'Account created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async getBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accountId = parseInt(req.params.accountId as string);
      if (isNaN(accountId)) {
        sendError(res, 'Invalid account ID', 400);
        return;
      }

      const result = await accountService.getBalance(accountId);
      sendSuccess(res, result, 'Balance retrieved');
    } catch (err) {
      next(err);
    }
  }

  async deposit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        sendError(res, 'Validation failed', 422, errors.array());
        return;
      }

      const accountId = parseInt(req.params.accountId as string);
      const account = await accountService.deposit(accountId, req.body.value);
      sendSuccess(
        res,
        { accountId: account.accountId, newBalance: account.balance },
        'Deposit successful'
      );
    } catch (err) {
      next(err);
    }
  }

  async withdraw(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        sendError(res, 'Validation failed', 422, errors.array());
        return;
      }

      const accountId = parseInt(req.params.accountId as string);
      const account = await accountService.withdraw(accountId, req.body.value);
      sendSuccess(
        res,
        { accountId: account.accountId, newBalance: account.balance },
        'Withdrawal successful'
      );
    } catch (err) {
      next(err);
    }
  }

  async blockAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accountId = parseInt(req.params.accountId as string);
      if (isNaN(accountId)) {
        sendError(res, 'Invalid account ID', 400);
        return;
      }

      const account = await accountService.blockAccount(accountId);
      sendSuccess(
        res,
        { accountId: account.accountId, activeFlag: account.activeFlag },
        'Account blocked'
      );
    } catch (err) {
      next(err);
    }
  }

  async getStatement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accountId = parseInt(req.params.accountId as string);
      if (isNaN(accountId)) {
        sendError(res, 'Invalid account ID', 400);
        return;
      }

      const { startDate, endDate, page, limit } = req.query;
      const statement = await accountService.getStatement(accountId, {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      });

      sendSuccess(res, statement, 'Statement retrieved');
    } catch (err) {
      next(err);
    }
  }
}

export const accountController = new AccountController();
