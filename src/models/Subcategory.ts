import mongoose, { Schema, Document } from 'mongoose';
export interface IFieldDefinition {
  label: string;
  key: string;
  fieldType: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect' | 'textarea' | 'checkbox' | 'switch';
  options?: string[];
  isFilterable: boolean;
  isRequired: boolean;
  sortOrder?: number;
  hasOtherOption?: boolean;
}

export interface ISubcategory extends Document {
  name: string;
  category?: mongoose.Types.ObjectId;
  media?: mongoose.Types.ObjectId;
  description?: string;
  customFieldDefinitions?: IFieldDefinition[];
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const FieldDefinitionSchema: Schema = new Schema({
  label: { type: String, required: true },
  key: { type: String, required: true },
  fieldType: {
    type: String,
    enum: ['text', 'number', 'boolean', 'date', 'select', 'multiselect', 'textarea', 'checkbox', 'switch'],
    default: 'text'
  },
  options: [{ type: String }],
  isFilterable: { type: Boolean, default: false },
  isRequired: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 },
  hasOtherOption: { type: Boolean, default: false },
}, { _id: false });

const SubcategorySchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category' },
    media: { type: Schema.Types.ObjectId, ref: 'Media' },
    description: { type: String },
    customFieldDefinitions: [FieldDefinitionSchema],
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ISubcategory>('Subcategory', SubcategorySchema);
