import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description?: string;
  seller: mongoose.Types.ObjectId;
  category: mongoose.Types.ObjectId;
  subcategory?: mongoose.Types.ObjectId;
  media: mongoose.Types.ObjectId[];
  price: number;
  stock?: number;
  customFields?: Record<string, any>; // Stores key-value pairs (e.g., { "brand": "Apple" })
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    subcategory: { type: Schema.Types.ObjectId, ref: 'Subcategory' },
    media: [{ type: Schema.Types.ObjectId, ref: 'Media' }],
    price: { type: Number, required: true, default: 0 },
    stock: { type: Number, default: 0 },
    customFields: { type: Schema.Types.Mixed }, // Dynamic object for easy filtering
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IProduct>('Product', ProductSchema);
