import mongoose, { Schema, Document } from 'mongoose';

export interface IUserSubscription extends Document {
  user: mongoose.Types.ObjectId;
  plan: mongoose.Types.ObjectId;
  startDate: Date;
  expiryDate?: Date;
  status: 'active' | 'expired' | 'cancelled';
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSubscriptionSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    startDate: { type: Date, default: Date.now },
    expiryDate: { type: Date },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active'
    },
    razorpayPaymentId: { type: String },
    razorpayOrderId: { type: String },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUserSubscription>('UserSubscription', UserSubscriptionSchema);
