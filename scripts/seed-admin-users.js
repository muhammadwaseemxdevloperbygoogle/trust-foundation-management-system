const fs = require("fs")
const path = require("path")
const { MongoClient } = require("mongodb")

function loadMongoUri() {
  const env = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8")
  const line = env.split(/\r?\n/).find((l) => l.startsWith("MONGODB_URI="))
  if (!line) throw new Error("MONGODB_URI missing")
  return line.slice("MONGODB_URI=".length).trim()
}

async function run() {
  const uri = loadMongoUri()
  const client = new MongoClient(uri)
  await client.connect()

  const db = client.db("imtiazdatabse")
  const users = db.collection("users")

  const seedUsers = [
    { username: "wasidev", password: "8735146", name: "wasidev" },
    { username: "imtiaz", password: "123456", name: "imtiaz" },
  ]

  for (const user of seedUsers) {
    await users.updateOne(
      { username: user.username },
      {
        $set: {
          username: user.username,
          password: user.password,
          name: user.name,
          role: "Admin",
          groups: ["core-admin"],
          rights: ["users:create", "users:update", "users:view", "data:all"],
          status: "Active",
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    )
  }

  const saved = await users
    .find(
      { username: { $in: ["wasidev", "imtiaz"] } },
      { projection: { _id: 0, username: 1, role: 1, status: 1 } }
    )
    .toArray()

  console.log(JSON.stringify(saved, null, 2))

  await client.close()
}

run().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
