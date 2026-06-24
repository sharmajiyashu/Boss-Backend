import mongoose, { Schema, Document } from 'mongoose';

export interface ILocationRange {
  id: string;
  min: number;
  max: number;
  label: string;
}

export interface IAppSetting extends Document {
  platformFees: number;
  reportReasons: string[];
  locationRanges: ILocationRange[];
  createdAt: Date;
  updatedAt: Date;
}

const LocationRangeSchema: Schema = new Schema({
  id: { type: String, required: true },
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  label: { type: String, required: true }
}, { _id: false });

const AppSettingSchema: Schema = new Schema(
  {
    platformFees: { type: Number, default: 0 },
    reportReasons: {
      type: [String],
      default: ['Fraud', 'Abuse', 'Spam', 'Fake product']
    },
    locationRanges: {
      type: [LocationRangeSchema],
      default: [
        { id: 'range_1', min: 0, max: 10, label: '0 to 10 km' },
        { id: 'range_2', min: 10, max: 50, label: '10 to 50 km' }
      ]
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IAppSetting>('AppSetting', AppSettingSchema);
