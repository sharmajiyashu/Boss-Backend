import mongoose, { Schema, Document } from 'mongoose';

export interface ICallHistory extends Document {
  caller: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  scheduledCallId?: mongoose.Types.ObjectId;
  startTime: Date;
  endTime: Date;
  duration: number; // in seconds
  status: 'completed' | 'missed' | 'declined';
  createdAt: Date;
  updatedAt: Date;
}

const CallHistorySchema: Schema = new Schema(
  {
    caller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    scheduledCallId: { type: Schema.Types.ObjectId, ref: 'Call' },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    duration: { type: Number, required: true }, // duration in seconds
    status: { 
      type: String, 
      enum: ['completed', 'missed', 'declined'], 
      default: 'completed' 
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ICallHistory>('CallHistory', CallHistorySchema);
