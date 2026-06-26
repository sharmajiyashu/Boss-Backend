import mongoose, { Schema, Document } from 'mongoose';

export interface ICall extends Document {
  caller: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  product?: mongoose.Types.ObjectId;
  chatId?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'ongoing' | 'completed' | 'missed' | 'declined';
  scheduledTime: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CallSchema: Schema = new Schema(
  {
    caller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    chatId: { type: String, index: true },
    status: { 
      type: String, 
      enum: ['pending', 'accepted', 'rejected', 'cancelled', 'ongoing', 'completed', 'missed', 'declined'], 
      default: 'pending' 
    },
    scheduledTime: { type: Date, required: true },
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ICall>('Call', CallSchema);
