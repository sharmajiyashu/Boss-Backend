import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  media?: mongoose.Types.ObjectId;
  description?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    media: { type: Schema.Types.ObjectId, ref: 'Media' },
    description: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ICategory>('Category', CategorySchema);
