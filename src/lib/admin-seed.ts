import { User } from "@/src/models"

let adminSeedChecked = false

export async function ensureAdminUserExists() {
  if (adminSeedChecked) return

  const existingAdmin = await User.findOne({ role: "Admin" }).lean()
  if (existingAdmin) {
    adminSeedChecked = true
    return
  }

  const envUsername = (process.env.USER_NAME || process.env.USERNAME || "admin").trim().toLowerCase()
  const envPassword = (process.env.PASSOWARD || process.env.PASSWORD || "admin123").trim()

  await User.create({
    username: envUsername,
    password: envPassword,
    name: envUsername,
    role: "Admin",
    groups: ["core-admin"],
    rights: ["users:create", "users:update", "users:view", "data:all"],
    status: "Active",
  })

  adminSeedChecked = true
}
