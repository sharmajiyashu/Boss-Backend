import mongoose from 'mongoose';

export interface ICountry extends mongoose.Document {
    name: string;
    iso2: string;
    iso3: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CountrySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true },
        iso2: { type: String, required: true, unique: true },
        iso3: { type: String, required: true, unique: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export default mongoose.model<ICountry>('Country', CountrySchema);
