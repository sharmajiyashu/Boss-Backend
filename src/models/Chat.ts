import mongoose, { Schema, Document } from 'mongoose';

export interface IParticipantRead {
  user: mongoose.Types.ObjectId;
  lastReadAt: Date;
}

export interface IChat extends Document {
  id: string; // Unique deterministic Room ID
  participantKey: string;
  participants: mongoose.Types.ObjectId[];
  participantDetails: Map<string, { name: string; image: string }>;
  unreadCounts: Map<string, number>;
  lastMessage?: mongoose.Types.ObjectId;
  lastMessageAt?: Date;
  lastMessageSenderId?: string;
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
    id: { type: String, required: true, unique: true, index: true },
    participantKey: { type: String, required: true, unique: true, index: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    participantDetails: {
      type: Map,
      of: new Schema({
        name: { type: String, required: true },
        image: { type: String, default: '' }
      }, { _id: false })
    },
    unreadCounts: {
      type: Map,
      of: { type: Number, default: 0 }
    },
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    lastMessageAt: { type: Date },
    lastMessageSenderId: { type: String, default: '' },
    lastMessagePreview: { type: String, default: '' },
    reads: { type: [ParticipantReadSchema], default: [] },
  },
  { timestamps: true }
);

ChatSchema.index({ participants: 1, lastMessageAt: -1 });

export default mongoose.model<IChat>('Chat', ChatSchema);
