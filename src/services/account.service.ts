import { Account, IAccount, AccountType } from '../models/Account';
import { Transaction, TransactionType } from '../models/Transaction';
import { Person } from '../models/Person';
import { logger } from '../utils/logger';

export interface CreateAccountDTO {
  personId: number;
  dailyWithdrawalLimit: number;
  accountType: AccountType;
  initialBalance?: number;
}

export interface StatementQuery {
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class AccountService {
  /**
   * Creates a new bank account for an existing person.
   * Validates that the person exists before creating the account.
   */
  async createAccount(dto: CreateAccountDTO): Promise<IAccount> {
    const person = await Person.findOne({ personId: dto.personId });
    if (!person) throw new Error(`Person with id ${dto.personId} not found`);

    const account = new Account({
      personId: dto.personId,
      balance: dto.initialBalance ?? 0,
      dailyWithdrawalLimit: dto.dailyWithdrawalLimit,
      activeFlag: true,
      accountType: dto.accountType,
      createDate: new Date(),
    });

    await account.save();
    logger.info(`Account created: accountId=${account.accountId}`);
    return account;
  }

  /**
   * Returns the current balance of an account.
   * Does not require the account to be active.
   */
  async getBalance(accountId: number) {
    const account = await this.findAccount(accountId);
    return { accountId: account.accountId, balance: account.balance };
  }

  /**
   * Deposits a positive amount into an account.
   * Rejects if the account is blocked or the value is <= 0.
   */
  async deposit(accountId: number, value: number): Promise<IAccount> {
    if (value <= 0) throw new Error('Deposit value must be greater than 0');

    const account = await Account.findOne({ accountId });
    if (!account) throw new Error(`Account ${accountId} not found`);
    if (!account.activeFlag) throw new Error(`Account ${accountId} is blocked`);

    account.balance += value;
    await account.save();

    await new Transaction({
      accountId,
      value,
      type: TransactionType.DEPOSIT,
      description: 'Deposit',
    }).save();

    logger.info(`Deposit OK: accountId=${accountId}, value=${value}`);
    return account;
  }

  /**
   * Withdraws an amount from an account.
   * Enforces three rules: account must be active, sufficient funds,
   * and the daily withdrawal limit must not be exceeded.
   */
  async withdraw(accountId: number, value: number): Promise<IAccount> {
    if (value <= 0) throw new Error('Withdrawal value must be greater than 0');

    const account = await Account.findOne({ accountId });
    if (!account) throw new Error(`Account ${accountId} not found`);
    if (!account.activeFlag) throw new Error(`Account ${accountId} is blocked`);
    if (account.balance < value) throw new Error('Insufficient funds');

    await this.checkDailyLimit(accountId, value);

    account.balance -= value;
    await account.save();

    await new Transaction({
      accountId,
      value: -value,
      type: TransactionType.WITHDRAWAL,
      description: 'Withdrawal',
    }).save();

    logger.info(`Withdrawal OK: accountId=${accountId}, value=${value}`);
    return account;
  }

  /**
   * Permanently blocks an account, preventing any further transactions.
   * Cannot be undone through the API.
   */
  async blockAccount(accountId: number): Promise<IAccount> {
    const account = await Account.findOne({ accountId });
    if (!account) throw new Error(`Account ${accountId} not found`);
    if (!account.activeFlag) throw new Error(`Account ${accountId} is already blocked`);

    account.activeFlag = false;
    await account.save();
    logger.info(`Account blocked: accountId=${accountId}`);
    return account;
  }

  /**
   * Returns a paginated list of transactions for a given account.
   * Optionally filtered by a date range (startDate / endDate).
   */
  async getStatement(accountId: number, query: StatementQuery) {
    const account = await this.findAccount(accountId);

    const filter: Record<string, unknown> = { accountId };

    if (query.startDate || query.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (query.startDate) dateFilter.$gte = query.startDate;
      if (query.endDate) dateFilter.$lte = query.endDate;
      filter.transactionDate = dateFilter;
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort({ transactionDate: -1 }).skip(skip).limit(limit),
      Transaction.countDocuments(filter),
    ]);

    return {
      accountId,
      currentBalance: account.balance,
      activeFlag: account.activeFlag,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      transactions,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  /**
   * Finds an account by ID. Throws if not found.
   * Does not check activeFlag — use this for operations that allow blocked accounts.
   */

  private async findAccount(accountId: number): Promise<IAccount> {
    const account = await Account.findOne({ accountId });
    if (!account) throw new Error(`Account ${accountId} not found`);
    return account;
  }

  /**
   * Checks that the requested withdrawal does not exceed the account's
   * daily withdrawal limit by aggregating all withdrawals made today.
   */
  private async checkDailyLimit(accountId: number, value: number): Promise<void> {
    const account = await Account.findOne({ accountId });
    if (!account) throw new Error(`Account ${accountId} not found`);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const result = await Transaction.aggregate([
      {
        $match: {
          accountId,
          type: TransactionType.WITHDRAWAL,
          transactionDate: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      { $group: { _id: null, total: { $sum: { $abs: '$value' } } } },
    ]);

    const alreadyWithdrawn = result[0]?.total ?? 0;

    if (alreadyWithdrawn + value > account.dailyWithdrawalLimit) {
      throw new Error(
        `Daily withdrawal limit exceeded. Limit: ${account.dailyWithdrawalLimit}, ` +
          `already withdrawn today: ${alreadyWithdrawn}, requested: ${value}`
      );
    }
  }
}

export const accountService = new AccountService();
