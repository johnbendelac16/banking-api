import mongoose, { Document, Schema } from 'mongoose';

export interface IPerson extends Document {
  personId: number;
  name: string;
  document: string;
  birthDate: Date;
}

const PersonSchema = new Schema<IPerson>(
  {
    personId: { type: Number, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    document: { type: String, required: true, unique: true, trim: true },
    birthDate: { type: Date, required: true },
  },
  { versionKey: false }
);

PersonSchema.pre('save', async function () {
  if (this.isNew) {
    const last = await Person.findOne().sort({ personId: -1 });
    this.personId = last ? last.personId + 1 : 1;
  }
});

export const Person = mongoose.model<IPerson>('Person', PersonSchema);
