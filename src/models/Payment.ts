import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  user: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  receipt: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  status: 'pending' | 'captured' | 'failed';
  paymentType: 'platform_fee' | 'wallet_topup' | 'other';
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    receipt: { type: String },
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String },
    status: { type: String, enum: ['pending', 'captured', 'failed'], default: 'pending' },
    paymentType: { type: String, enum: ['platform_fee', 'wallet_topup', 'other'], default: 'other' },
  },
  { timestamps: true }
);

export default mongoose.model<IPayment>('Payment', PaymentSchema);
