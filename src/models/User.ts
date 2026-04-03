import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  mobile?: string;
  userRole: 'user' | 'admin';
  bio?: string;
  otp?: string;
  otpExpires?: Date;
  walletBalance: number;
  referralCode?: string;
  adminRoleId?: mongoose.Types.ObjectId;
  location?: {
    lat?: number;
    lng?: number;
    address?: string;
    city?: string;
    state?: string;
    zipcode?: string;
  };
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    password: { type: String },
    mobile: { type: String, unique: true, sparse: true },
    userRole: { type: String, enum: ['user', 'admin'], default: 'user' },
    bio: { type: String },
    otp: { type: String },
    otpExpires: { type: Date },
    walletBalance: { type: Number, default: 0 },
    referralCode: { type: String, unique: true, sparse: true },
    adminRoleId: { type: Schema.Types.ObjectId, ref: 'AdminRole' },
    location: {
      lat: { type: Number },
      lng: { type: Number },
      address: { type: String },
      city: { type: String },
      state: { type: String },
      zipcode: { type: String },
    },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>('User', UserSchema);
