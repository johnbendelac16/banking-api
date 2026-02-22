import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../app';
import { Person } from '../models/Person';
import { Account, AccountType } from '../models/Account';
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

  await Person.create({
    personId: 1,
    name: 'Integration Test User',
    document: '000.000.000-00',
    birthDate: new Date('1995-06-20'),
  });
});

describe('GET /health', () => {
  it('should return 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/accounts', () => {
  it('should create account with valid data', async () => {
    const res = await request(app).post('/api/accounts').send({
      personId: 1,
      dailyWithdrawalLimit: 500,
      accountType: AccountType.CHECKING,
      initialBalance: 100,
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accountId).toBeDefined();
  });

  it('should return 422 on missing fields', async () => {
    const res = await request(app).post('/api/accounts').send({});
    expect(res.status).toBe(422);
  });

  it('should return 400 for non-existent person', async () => {
    const res = await request(app).post('/api/accounts').send({
      personId: 999,
      dailyWithdrawalLimit: 500,
      accountType: AccountType.CHECKING,
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/accounts/:accountId/balance', () => {
  it('should return balance', async () => {
    const createRes = await request(app).post('/api/accounts').send({
      personId: 1,
      dailyWithdrawalLimit: 500,
      accountType: AccountType.CHECKING,
      initialBalance: 250,
    });
    const { accountId } = createRes.body.data;

    const res = await request(app).get(`/api/accounts/${accountId}/balance`);
    expect(res.status).toBe(200);
    expect(res.body.data.balance).toBe(250);
  });

  it('should return 400 for unknown account', async () => {
    const res = await request(app).get('/api/accounts/9999/balance');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/accounts/:accountId/deposit', () => {
  let accountId: number;

  beforeEach(async () => {
    const res = await request(app).post('/api/accounts').send({
      personId: 1,
      dailyWithdrawalLimit: 500,
      accountType: AccountType.CHECKING,
      initialBalance: 0,
    });
    accountId = res.body.data.accountId;
  });

  it('should deposit successfully', async () => {
    const res = await request(app).post(`/api/accounts/${accountId}/deposit`).send({ value: 300 });

    expect(res.status).toBe(200);
    expect(res.body.data.newBalance).toBe(300);
  });

  it('should reject 0 value', async () => {
    const res = await request(app).post(`/api/accounts/${accountId}/deposit`).send({ value: 0 });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/accounts/:accountId/withdraw', () => {
  let accountId: number;

  beforeEach(async () => {
    const res = await request(app).post('/api/accounts').send({
      personId: 1,
      dailyWithdrawalLimit: 500,
      accountType: AccountType.CHECKING,
      initialBalance: 1000,
    });
    accountId = res.body.data.accountId;
  });

  it('should withdraw successfully', async () => {
    const res = await request(app).post(`/api/accounts/${accountId}/withdraw`).send({ value: 200 });

    expect(res.status).toBe(200);
    expect(res.body.data.newBalance).toBe(800);
  });

  it('should reject insufficient funds', async () => {
    const res = await request(app)
      .post(`/api/accounts/${accountId}/withdraw`)
      .send({ value: 5000 });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/accounts/:accountId/block', () => {
  it('should block account', async () => {
    const createRes = await request(app).post('/api/accounts').send({
      personId: 1,
      dailyWithdrawalLimit: 500,
      accountType: AccountType.CHECKING,
    });
    const accountId = createRes.body.data.accountId;

    const res = await request(app).patch(`/api/accounts/${accountId}/block`);
    expect(res.status).toBe(200);
    expect(res.body.data.activeFlag).toBe(false);
  });
});

describe('GET /api/accounts/:accountId/statement', () => {
  it('should return statement', async () => {
    const createRes = await request(app).post('/api/accounts').send({
      personId: 1,
      dailyWithdrawalLimit: 1000,
      accountType: AccountType.CHECKING,
      initialBalance: 500,
    });
    const accountId = createRes.body.data.accountId;

    await request(app).post(`/api/accounts/${accountId}/deposit`).send({ value: 100 });

    const res = await request(app).get(`/api/accounts/${accountId}/statement`);
    expect(res.status).toBe(200);
    expect(res.body.data.transactions.length).toBe(1);
  });

  it('should filter by date', async () => {
    const createRes = await request(app).post('/api/accounts').send({
      personId: 1,
      dailyWithdrawalLimit: 1000,
      accountType: AccountType.CHECKING,
      initialBalance: 500,
    });
    const accountId = createRes.body.data.accountId;

    await request(app).post(`/api/accounts/${accountId}/deposit`).send({ value: 100 });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const res = await request(app)
      .get(`/api/accounts/${accountId}/statement`)
      .query({ startDate: yesterday.toISOString(), endDate: tomorrow.toISOString() });

    expect(res.status).toBe(200);
    expect(res.body.data.transactions.length).toBe(1);
  });
});
