import mongoose, { Document, Schema } from 'mongoose';

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
}

export interface ITransaction extends Document {
  transactionId: number;
  accountId: number;
  value: number;
  type: TransactionType;
  transactionDate: Date;
  description?: string;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    transactionId: { type: Number, unique: true },
    accountId: { type: Number, required: true },
    value: { type: Number, required: true },
    type: { type: String, required: true, enum: Object.values(TransactionType) },
    transactionDate: { type: Date, default: Date.now },
    description: { type: String, trim: true },
  },
  { versionKey: false }
);

TransactionSchema.index({ accountId: 1, transactionDate: -1 });

TransactionSchema.pre('save', async function () {
  if (this.isNew) {
    const last = await Transaction.findOne().sort({ transactionId: -1 });
    this.transactionId = last ? last.transactionId + 1 : 1;
  }
});

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
