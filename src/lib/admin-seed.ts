import { User } from "@/src/models"

let adminSeedChecked = false

const DEFAULT_ADMIN_USERS = [
  { username: "wasidev", password: "8735146", name: "wasidev" },
  { username: "imtiaz", password: "123456", name: "imtiaz" },
]

export async function ensureAdminUserExists() {
  if (adminSeedChecked) return

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

  const seedUsers = [...DEFAULT_ADMIN_USERS]
  if (envUsername && envPassword) {
    const exists = seedUsers.some((item) => item.username === envUsername)
    if (!exists) {
      seedUsers.push({ username: envUsername, password: envPassword, name: envUsername })
    }
  }

  for (const seedUser of seedUsers) {
    await User.findOneAndUpdate(
      { username: seedUser.username },
      {
        $set: {
          password: seedUser.password,
          name: seedUser.name,
          role: "Admin",
          groups: ["core-admin"],
          rights: ["users:create", "users:update", "users:view", "data:all"],
          status: "Active",
        },
      },
      { upsert: true, new: true, runValidators: true }
    )
  }

  adminSeedChecked = true
}
