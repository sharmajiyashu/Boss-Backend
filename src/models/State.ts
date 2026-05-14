import mongoose from 'mongoose';

export interface IState extends mongoose.Document {
    name: string;
    code: string;
    countryId: mongoose.Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const StateSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        code: { type: String, required: true },
        countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

// Compound index to ensure state name/code is unique within a country
StateSchema.index({ name: 1, countryId: 1 }, { unique: true });
StateSchema.index({ code: 1, countryId: 1 }, { unique: true });

export default mongoose.model<IState>('State', StateSchema);
