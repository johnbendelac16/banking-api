import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { accountService } from '../services/account.service';
import { Account, AccountType } from '../models/Account';
import { Person } from '../models/Person';
import { Transaction } from '../models/Transaction';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Person.deleteMany({});
  await Account.deleteMany({});
  await Transaction.deleteMany({});

  // Seed a person
  await Person.create({
    personId: 1,
    name: 'Test User',
    document: '123.456.789-00',
    birthDate: new Date('1990-01-01'),
  });
});

describe('AccountService', () => {
  describe('createAccount', () => {
    it('should create an account successfully', async () => {
      const account = await accountService.createAccount({
        personId: 1,
        dailyWithdrawalLimit: 500,
        accountType: AccountType.CHECKING,
        initialBalance: 100,
      });

      expect(account.accountId).toBeDefined();
      expect(account.balance).toBe(100);
      expect(account.activeFlag).toBe(true);
      expect(account.personId).toBe(1);
    });

    it('should throw if person does not exist', async () => {
      await expect(
        accountService.createAccount({
          personId: 999,
          dailyWithdrawalLimit: 500,
          accountType: AccountType.CHECKING,
        })
      ).rejects.toThrow('not found');
    });

    it('should default balance to 0 if not provided', async () => {
      const account = await accountService.createAccount({
        personId: 1,
        dailyWithdrawalLimit: 500,
        accountType: AccountType.SAVINGS,
      });
      expect(account.balance).toBe(0);
    });
  });

  describe('deposit', () => {
    let accountId: number;

    beforeEach(async () => {
      const acc = await accountService.createAccount({
        personId: 1,
        dailyWithdrawalLimit: 500,
        accountType: AccountType.CHECKING,
        initialBalance: 0,
      });
      accountId = acc.accountId;
    });

    it('should increase balance on deposit', async () => {
      const account = await accountService.deposit(accountId, 200);
      expect(account.balance).toBe(200);
    });

    it('should create a transaction record', async () => {
      await accountService.deposit(accountId, 150);
      const tx = await Transaction.findOne({ accountId });
      expect(tx).not.toBeNull();
      expect(tx?.value).toBe(150);
    });

    it('should reject deposit of 0 or negative', async () => {
      await expect(accountService.deposit(accountId, 0)).rejects.toThrow();
      await expect(accountService.deposit(accountId, -50)).rejects.toThrow();
    });

    it('should reject deposit to blocked account', async () => {
      await accountService.blockAccount(accountId);
      await expect(accountService.deposit(accountId, 100)).rejects.toThrow('blocked');
    });
  });

  describe('withdraw', () => {
    let accountId: number;

    beforeEach(async () => {
      const acc = await accountService.createAccount({
        personId: 1,
        dailyWithdrawalLimit: 500,
        accountType: AccountType.CHECKING,
        initialBalance: 1000,
      });
      accountId = acc.accountId;
    });

    it('should decrease balance on withdrawal', async () => {
      const account = await accountService.withdraw(accountId, 200);
      expect(account.balance).toBe(800);
    });

    it('should reject withdrawal with insufficient funds', async () => {
      await expect(accountService.withdraw(accountId, 2000)).rejects.toThrow('Insufficient funds');
    });

    it('should reject withdrawal exceeding daily limit', async () => {
      await expect(accountService.withdraw(accountId, 600)).rejects.toThrow(
        'Daily withdrawal limit exceeded'
      );
    });

    it('should reject withdrawal from blocked account', async () => {
      await accountService.blockAccount(accountId);
      await expect(accountService.withdraw(accountId, 100)).rejects.toThrow('blocked');
    });

    it('should record negative value in transaction', async () => {
      await accountService.withdraw(accountId, 100);
      const tx = await Transaction.findOne({ accountId, type: 'WITHDRAWAL' });
      expect(tx?.value).toBe(-100);
    });
  });

  describe('blockAccount', () => {
    it('should block an active account', async () => {
      const acc = await accountService.createAccount({
        personId: 1,
        dailyWithdrawalLimit: 500,
        accountType: AccountType.CHECKING,
      });
      const blocked = await accountService.blockAccount(acc.accountId);
      expect(blocked.activeFlag).toBe(false);
    });

    it('should throw if account already blocked', async () => {
      const acc = await accountService.createAccount({
        personId: 1,
        dailyWithdrawalLimit: 500,
        accountType: AccountType.CHECKING,
      });
      await accountService.blockAccount(acc.accountId);
      await expect(accountService.blockAccount(acc.accountId)).rejects.toThrow('already blocked');
    });
  });

  describe('getStatement', () => {
    it('should return paginated statement', async () => {
      const acc = await accountService.createAccount({
        personId: 1,
        dailyWithdrawalLimit: 1000,
        accountType: AccountType.CHECKING,
        initialBalance: 500,
      });

      await accountService.deposit(acc.accountId, 100);
      await accountService.deposit(acc.accountId, 200);

      const statement = await accountService.getStatement(acc.accountId, { page: 1, limit: 10 });

      expect(statement.transactions.length).toBe(2);
      expect(statement.currentBalance).toBe(800);
      expect(statement.pagination.total).toBe(2);
    });

    it('should filter by date period', async () => {
      const acc = await accountService.createAccount({
        personId: 1,
        dailyWithdrawalLimit: 1000,
        accountType: AccountType.CHECKING,
        initialBalance: 500,
      });

      await accountService.deposit(acc.accountId, 100);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const statement = await accountService.getStatement(acc.accountId, {
        startDate: yesterday,
        endDate: tomorrow,
      });

      expect(statement.transactions.length).toBe(1);
    });
  });
});
