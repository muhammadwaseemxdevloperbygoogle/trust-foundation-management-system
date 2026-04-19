import { Schema, model, models, Types } from "mongoose"

export interface PaymentDocument {
  paymentNo?: string
  paymentId: string
  donor: Types.ObjectId
  amount: number
  month: number
  year: number
  paymentDate: Date
  method: "cash" | "bank_transfer" | "easypaisa" | "jazzcash"
  status: "paid" | "pending" | "missed"
  receivedBy?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const paymentSchema = new Schema<PaymentDocument>(
  {
    paymentNo: { type: String, index: true, sparse: true, trim: true },
    paymentId: { type: String, unique: true, index: true },
    donor: { type: Schema.Types.ObjectId, ref: "Donor", required: true, index: true },
    amount: { type: Number, default: 1000, min: 1 },
    month: { type: Number, required: true, min: 1, max: 12, index: true },
    year: { type: Number, required: true, index: true },
    paymentDate: { type: Date, default: Date.now },
    method: {
      type: String,
      enum: ["cash", "bank_transfer", "easypaisa", "jazzcash"],
      default: "cash",
    },
    status: { type: String, enum: ["paid", "pending", "missed"], default: "paid", index: true },
    receivedBy: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
)

paymentSchema.pre("validate", function preValidate() {
  if (!this.paymentNo) {
    this.paymentNo = `WTF-PNO-${Date.now()}-${Math.floor(Math.random() * 100000)}`
  }

  if (!this.paymentId) {
    this.paymentId = `WTF-PAY-${Date.now()}-${Math.floor(Math.random() * 100000)}`
  }
})

paymentSchema.index({ donor: 1, month: 1, year: 1 }, { unique: true })

export const Payment = models.Payment || model<PaymentDocument>("Payment", paymentSchema)
