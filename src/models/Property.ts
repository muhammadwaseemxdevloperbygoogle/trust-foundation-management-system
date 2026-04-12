import { Schema, model, models } from "mongoose"

export interface PropertyDocument {
  propertyId: string
  name: string
  type: "Land" | "Building" | "Agricultural"
  location: string
  status: "Active" | "Inactive"
  annualValue: number
  deedNumber?: string
  dateRegistered?: Date
  area?: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

const propertySchema = new Schema<PropertyDocument>(
  {
    propertyId: { type: String, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["Land", "Building", "Agricultural"], default: "Land" },
    location: { type: String, required: true, trim: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active", index: true },
    annualValue: { type: Number, default: 0, min: 0 },
    deedNumber: { type: String, trim: true },
    dateRegistered: { type: Date },
    area: { type: String, trim: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
)

propertySchema.pre("validate", async function preValidate(next) {
  if (this.propertyId) return next()
  const count = await Property.countDocuments()
  this.propertyId = `WTF-PRP-${String(count + 1).padStart(3, "0")}`
  next()
})

export const Property = models.Property || model<PropertyDocument>("Property", propertySchema)
