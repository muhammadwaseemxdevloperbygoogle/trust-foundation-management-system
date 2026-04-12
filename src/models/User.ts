import { Schema, model, models } from "mongoose"

export type UserRole = "Admin" | "Trustee" | "Auditor" | "Viewer"

export interface UserDocument {
  username: string
  password: string
  name: string
  email?: string
  role: UserRole
  groups: string[]
  rights: string[]
  status: "Active" | "Inactive"
  lastLogin?: Date
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<UserDocument>(
  {
    username: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    password: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    role: { type: String, enum: ["Admin", "Trustee", "Auditor", "Viewer"], default: "Viewer", index: true },
    groups: { type: [String], default: [] },
    rights: { type: [String], default: [] },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active", index: true },
    lastLogin: { type: Date },
  },
  { timestamps: true }
)

export const User = models.User || model<UserDocument>("User", userSchema)
