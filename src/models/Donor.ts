import { Schema, model, models } from "mongoose"

export interface DonorDocument {
  donorId: string
  name: string
  phone: string
  cnic?: string
  email?: string
  address?: string
  city?: string
  joinDate: Date
  status: "active" | "inactive"
  monthlyAmount: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const donorSchema = new Schema<DonorDocument>(
  {
    donorId: { type: String, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    cnic: {
      type: String,
      trim: true,
      validate: {
        validator: (v: string) => !v || /^\d{5}-\d{7}-\d$/.test(v),
        message: "CNIC must be in format 12345-1234567-1",
      },
    },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    joinDate: { type: Date, default: Date.now },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    monthlyAmount: { type: Number, default: 1000, min: 1 },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
)

export const Donor = models.Donor || model<DonorDocument>("Donor", donorSchema)
