const fs = require("fs")
const path = require("path")
const mongoose = require("mongoose")

function readMongoUri() {
  const envPath = path.join(process.cwd(), ".env.local")
  const envText = fs.readFileSync(envPath, "utf8")
  for (const line of envText.split(/\r?\n/)) {
    const idx = line.indexOf("=")
    if (idx < 0) continue
    if (line.slice(0, idx).trim() === "MONGODB_URI") {
      return line.slice(idx + 1).trim().replace(/^"|"$/g, "")
    }
  }
  return ""
}

async function main() {
  const uri = process.env.MONGODB_URI || readMongoUri()
  if (!uri) throw new Error("MONGODB_URI not found")

  await mongoose.connect(uri, { bufferCommands: false })
  const settings = mongoose.connection.collection("settings")

  await settings.updateOne(
    {},
    {
      $set: {
        applicationName: "WASI TRUST MANGMENT SYSTEM",
        trustName: "WASI TRUST MANGMENT SYSTEM",
        updatedAt: new Date(),
      },
      $setOnInsert: {
        monthlyTarget: 1000,
      },
    },
    { upsert: true }
  )

  const doc = await settings.findOne({}, { projection: { _id: 0, applicationName: 1, trustName: 1 } })
  console.log(JSON.stringify(doc, null, 2))

  await mongoose.disconnect()
}

main().catch(async (error) => {
  console.error(error.message)
  try {
    await mongoose.disconnect()
  } catch {}
  process.exit(1)
})
