import { User } from "@/src/models"

let adminSeedChecked = false

export async function ensureAdminUserExists() {
  if (adminSeedChecked) return

  const existingAdmin = await User.findOne({ role: "Admin" }).lean()
  if (existingAdmin) {
    adminSeedChecked = true
    return
  }

  const rawUsername =
    process.env.APP_ADMIN_USERNAME ||
    process.env.USER_NAME ||
    process.env.USERNAME ||
    ""
  const rawPassword =
    process.env.APP_ADMIN_PASSWORD ||
    process.env.PASSOWARD ||
    process.env.PASSWORD ||
    ""
  const envUsername = rawUsername.trim().toLowerCase()
  const envPassword = rawPassword.trim()

  if (!envUsername || !envPassword) {
    adminSeedChecked = true
    return
  }

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
