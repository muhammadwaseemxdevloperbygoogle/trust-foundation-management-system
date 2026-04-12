import { Schema, model, models } from "mongoose"

export interface AuditLogDocument {
  action: "create" | "update" | "delete" | "payment_recorded" | "export"
  model: string
  recordId: string
  description?: string
  performedBy?: string
  createdAt: Date
}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    action: {
      type: String,
      enum: ["create", "update", "delete", "payment_recorded", "export"],
      required: true,
      index: true,
    },
    model: { type: String, required: true, index: true },
    recordId: { type: String, required: true, index: true },
    description: { type: String, trim: true },
    performedBy: { type: String, trim: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

export const AuditLog = models.AuditLog || model<AuditLogDocument>("AuditLog", auditLogSchema)
