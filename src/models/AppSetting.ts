import mongoose, { Schema, Document } from 'mongoose';

export interface IAppSetting extends Document {
  platformFees: number;
  reportReasons: string[];
  createdAt: Date;
  updatedAt: Date;
}

const AppSettingSchema: Schema = new Schema(
  {
    platformFees: { type: Number, default: 0 },
    reportReasons: {
      type: [String],
      default: ['Fraud', 'Abuse', 'Spam', 'Fake product']
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IAppSetting>('AppSetting', AppSettingSchema);
