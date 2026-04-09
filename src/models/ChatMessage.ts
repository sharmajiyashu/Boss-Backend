import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  chat: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  text?: string;
  media: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema: Schema = new Schema(
  {
    chat: { type: Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, trim: true },
    media: [{ type: Schema.Types.ObjectId, ref: 'Media' }],
  },
  { timestamps: true }
);

ChatMessageSchema.index({ chat: 1, createdAt: -1 });

export default mongoose.model<IChatMessage>('Message', ChatMessageSchema);
