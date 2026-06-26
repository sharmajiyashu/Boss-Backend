import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  chat: mongoose.Types.ObjectId;
  chatId: string;
  sender: mongoose.Types.ObjectId;
  text?: string;
  media: { url: string }[];
  seenAt: Date | null;
  chat_type: string;
  status?: string;
  stataus?: string;
  productData?: {
    id?: string;
    _id?: string;
    name?: string;
    price?: number;
    media?: any;
    location?: any;
  };
  requestId?: string;
  scheduledAtStr?: string;
  scheduledTime?: Date;
  scheduledCallId?: mongoose.Types.ObjectId;
  scheduledBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema: Schema = new Schema(
  {
    chat: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
    chatId: { type: String, required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, trim: true },
    media: [
      {
        url: { type: String, required: true }
      }
    ],
    seenAt: { type: Date, default: null },
    chat_type: { type: String, default: 'text' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled', 'ongoing', 'completed', 'missed', 'declined', 'scheduled'],
      default: undefined
    },
    stataus: { type: String, default: undefined },
    productData: {
      id: { type: String },
      _id: { type: String },
      name: { type: String },
      price: { type: Number },
      media: { type: Schema.Types.Mixed },
      location: { type: Schema.Types.Mixed }
    },
    requestId: { type: String },
    scheduledAtStr: { type: String },
    scheduledTime: { type: Date },
    scheduledCallId: { type: Schema.Types.ObjectId, ref: 'Call' },
    scheduledBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

ChatMessageSchema.index({ chat: 1, createdAt: -1 });
ChatMessageSchema.index({ scheduledCallId: 1 });

export default mongoose.model<IChatMessage>('Message', ChatMessageSchema);
