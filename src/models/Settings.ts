import { Schema, model, models } from "mongoose"

export interface SettingsDocument {
  applicationName: string
  trustName: string
  tagline?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  ownerName?: string
  ownerPhone?: string
  ownerCnic?: string
  registrationNumber?: string
  establishedYear?: number
  monthlyTarget: number
  logoUrl?: string
  updatedAt: Date
}

const settingsSchema = new Schema<SettingsDocument>(
  {
    applicationName: { type: String, default: "WASI TRUST MANGMENT SYSTEM", trim: true },
    trustName: { type: String, default: "Al-Khair Waqf Trust", trim: true },
    tagline: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    ownerName: { type: String, trim: true, default: "Muhammad Hassan" },
    ownerPhone: { type: String, trim: true },
    ownerCnic: {
      type: String,
      trim: true,
      validate: {
        validator: (v: string) => !v || /^\d{5}-\d{7}-\d$/.test(v),
        message: "CNIC must be in format 12345-1234567-1",
      },
    },
    registrationNumber: { type: String, trim: true },
    establishedYear: { type: Number },
    monthlyTarget: { type: Number, default: 1000, min: 1 },
    logoUrl: { type: String, trim: true },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
)

export const Settings = models.Settings || model<SettingsDocument>("Settings", settingsSchema)
