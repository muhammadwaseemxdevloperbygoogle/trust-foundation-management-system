import { Schema, model, models } from "mongoose"

export interface ExpenditureDocument {
  expenditureId: string
  title: string
  category: "operations" | "charity" | "maintenance" | "salaries" | "events" | "other"
  amount: number
  date: Date
  description?: string
  approvedBy?: string
  receiptNumber?: string
  createdAt: Date
  updatedAt: Date
}

const expenditureSchema = new Schema<ExpenditureDocument>(
  {
    expenditureId: { type: String, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["operations", "charity", "maintenance", "salaries", "events", "other"],
      default: "other",
      index: true,
    },
    amount: { type: Number, required: true, min: 1 },
    date: { type: Date, required: true, index: true },
    description: { type: String, trim: true },
    approvedBy: { type: String, trim: true },
    receiptNumber: { type: String, trim: true },
  },
  { timestamps: true }
)

expenditureSchema.pre("validate", function preValidate(next) {
  if (!this.expenditureId) {
    this.expenditureId = `WTF-EXP-${Date.now()}`
  }
  next()
})

export const Expenditure =
  models.Expenditure || model<ExpenditureDocument>("Expenditure", expenditureSchema)
