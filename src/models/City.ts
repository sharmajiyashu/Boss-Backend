import mongoose from 'mongoose';

export interface ICity extends mongoose.Document {
    name: string;
    stateId: mongoose.Types.ObjectId;
    countryId: mongoose.Types.ObjectId;
    latitude: number;
    longitude: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CitySchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        stateId: { type: mongoose.Schema.Types.ObjectId, ref: 'State', required: true },
        countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

// Compound index to ensure city name is unique within a state
CitySchema.index({ name: 1, stateId: 1 }, { unique: true });

export default mongoose.model<ICity>('City', CitySchema);
