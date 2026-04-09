import mongoose, { Schema, Document } from 'mongoose';

export interface IParticipantRead {
  user: mongoose.Types.ObjectId;
  lastReadAt: Date;
}

export interface IChat extends Document {
  participantKey: string;
  participants: mongoose.Types.ObjectId[];
  lastMessage?: mongoose.Types.ObjectId;
  lastMessageAt?: Date;
  lastMessagePreview: string;
  reads: IParticipantRead[];
  createdAt: Date;
  updatedAt: Date;
}

const ParticipantReadSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lastReadAt: { type: Date, required: true },
  },
  { _id: false }
);

const ChatSchema: Schema = new Schema(
  {
    participantKey: { type: String, required: true, unique: true, index: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    lastMessageAt: { type: Date },
    lastMessagePreview: { type: String, default: '' },
    reads: { type: [ParticipantReadSchema], default: [] },
  },
  { timestamps: true }
);

ChatSchema.index({ participants: 1, lastMessageAt: -1 });

export default mongoose.model<IChat>('Chat', ChatSchema);
