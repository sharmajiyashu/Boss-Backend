import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  reporter: mongoose.Types.ObjectId;
  targetUser?: mongoose.Types.ObjectId;
  targetProduct?: mongoose.Types.ObjectId;
  reason: string;
  description?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema: Schema = new Schema(
  {
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetUser: { type: Schema.Types.ObjectId, ref: 'User' },
    targetProduct: { type: Schema.Types.ObjectId, ref: 'Product' },
    reason: { type: String, required: true },
    description: { type: String },
    status: { 
      type: String, 
      enum: ['pending', 'resolved', 'dismissed'], 
      default: 'pending' 
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IReport>('Report', ReportSchema);
