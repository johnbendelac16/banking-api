import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { Person } from '../models/Person';
import { Account, AccountType } from '../models/Account';

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/banking_db');
  console.log('Connected');

  await Account.deleteMany({});
  await Person.deleteMany({});

  // Attendre que les suppressions soient bien commitées
  await new Promise((r) => setTimeout(r, 500));

  const john = new Person({
    personId: 1,
    name: 'John Doe',
    document: '123.456.789-00',
    birthDate: new Date('1990-05-15'),
  });
  const bob = new Person({
    personId: 2,
    name: 'Bob Tyson',
    document: '887.654.321-00',
    birthDate: new Date('1985-11-22'),
  });
  await john.save();
  await bob.save();

  const acc1 = new Account({
    accountId: 1,
    personId: 1,
    balance: 1000,
    dailyWithdrawalLimit: 500,
    activeFlag: true,
    accountType: AccountType.CHECKING,
    createDate: new Date(),
  });
  const acc2 = new Account({
    accountId: 2,
    personId: 2,
    balance: 5000,
    dailyWithdrawalLimit: 2000,
    activeFlag: true,
    accountType: AccountType.SAVINGS,
    createDate: new Date(),
  });
  await acc1.save();
  await acc2.save();

  console.log('✅ Seed done');
  console.table([
    { personId: 1, name: 'John Doe' },
    { personId: 2, name: 'Bob Tyson' },
  ]);
  console.table([
    { accountId: 1, balance: 1000 },
    { accountId: 2, balance: 5000 },
  ]);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
