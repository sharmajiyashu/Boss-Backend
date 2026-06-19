import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  title: string;
  message: string;
  recipient: mongoose.Types.ObjectId | 'all' | 'admin';
  sender?: mongoose.Types.ObjectId;
  type: string;
  isRead: boolean;
  readBy: mongoose.Types.ObjectId[];
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    recipient: { type: Schema.Types.Mixed, required: true }, // Can be a User ObjectId, 'all', or 'admin'
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, default: 'general' },
    isRead: { type: Boolean, default: false },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    metadata: { type: Schema.Types.Mixed }
  },
  {
    timestamps: true,
  }
);

// Add indexes for efficient querying
NotificationSchema.index({ recipient: 1, createdAt: -1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
