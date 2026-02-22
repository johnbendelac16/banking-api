import mongoose, { Document, Schema } from 'mongoose';

export enum AccountType {
  CHECKING = 1,
  SAVINGS = 2,
  SALARY = 3,
}

export interface IAccount extends Document {
  accountId: number;
  personId: number;
  balance: number;
  dailyWithdrawalLimit: number;
  activeFlag: boolean;
  accountType: AccountType;
  createDate: Date;
}

const AccountSchema = new Schema<IAccount>(
  {
    accountId: { type: Number, unique: true },
    personId: { type: Number, required: true },
    balance: { type: Number, required: true, default: 0, min: 0 },
    dailyWithdrawalLimit: { type: Number, required: true, min: 0 },
    activeFlag: { type: Boolean, required: true, default: true },
    accountType: {
      type: Number,
      required: true,
      enum: Object.values(AccountType).filter((v) => typeof v === 'number'),
    },
    createDate: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

AccountSchema.pre('save', async function () {
  if (this.isNew) {
    const last = await Account.findOne().sort({ accountId: -1 });
    this.accountId = last ? last.accountId + 1 : 1;
  }
});

export const Account = mongoose.model<IAccount>('Account', AccountSchema);
