import mongoose, { Schema, Document } from 'mongoose';

export interface ICMSPage extends Document {
  title: string;
  slug: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const CMSPageSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    content: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ICMSPage>('CMSPage', CMSPageSchema);
